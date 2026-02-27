/**
 * app.js - Main controller application
 * Integrates all modules for the Eternal Light controller interface
 */

// Imports updated
import { parseQuery, fetchVerse, fullTextSearch, getNextVerse, getPrevVerse, getBookTitle, BIBLE_BOOKS, getBookTitleById } from './modules/search.js';
import { showVerse, showNote, showSong, showSlide, hideDisplay, updateDisplaySettings, openDisplayWindow, sendToDisplay, setDisplayWindow, isDisplayAvailable } from './modules/broadcast.js';
import { addToHistory, renderHistory, getFromHistory, clearHistory as clearHistoryData } from './modules/history.js';
import { loadSettings, saveSettings, getEdit, saveEdit } from './modules/settings.js';
import { updateStatus } from './modules/dom-utils.js';
import { loadSongbooks, getSongbooks, saveSong, searchSongs, deleteSong } from './modules/songs.js';
import { initDB, savePresentation, loadPresentations, getPresentation, deletePresentation, hardDeletePresentation, restorePresentation, processFiles } from './modules/presentations.js';
import {
    initDB as initBgDB,
    saveBackground,
    loadBackgrounds,
    deleteBackground,
    getActiveBackgroundId,
    setActiveBackgroundId
} from './modules/backgrounds.js';
import {
    initBibleUI,
    handleSearch,
    goToNextVerse,
    goToPrevVerse,
    openTextSearch,
    closeTextSearch,
    openBibleNavModal,
    closeBibleNavModal,
    bibleNavGoBack
} from './modules/bible-ui.js';

import {
    openAddSongModal,
    closeSongModal,
    insertSongTag,
    saveSongForm,
    editCurrentSong,
    handleSongSearch,
    handleSongbookChange,
    populateSongbookSelector,
    renderSongList,
    goToNextStanza,
    goToPrevStanza,
    broadcastSong,
    confirmDeleteSong
} from './modules/songs-ui.js';

import { initNotesUI, broadcastNote } from './modules/notes-ui.js';

import { state, elements } from './modules/state.js';





// === DATABASE REFERENCES ===
// These will be available globally after script loads
const getDatabases = () => ({
    RST: window.BIBLE_DATA,
    NRT: window.NRT_DATA,
    KTB: window.KTB_DATA,
    KYB: window.KYB_DATA
});

const getKtbBookMap = () => window.KTB_BOOK_MAP;
const getKybBookMap = () => window.KYB_BOOK_MAP;

// === INITIALIZATION ===
async function init() {
    const loadingBar = document.getElementById('loading-bar');
    const loadingStatus = document.getElementById('loading-status');

    // Track loading progress
    const dbs = getDatabases();
    let loaded = 0;
    const total = 4;

    const updateProgress = (count) => {
        if (loadingBar) loadingBar.style.width = `${(count / total) * 100}%`;
        if (loadingStatus) loadingStatus.textContent = `${count} / ${total} переводов`;
    };

    // Count loaded translations
    if (dbs.RST) loaded++;
    updateProgress(loaded);
    if (dbs.NRT) loaded++;
    updateProgress(loaded);
    if (dbs.KTB) loaded++;
    updateProgress(loaded);
    if (dbs.KYB) loaded++;
    updateProgress(loaded);

    // Check if all data is loaded
    if (loaded < total) {
        const missing = [];
        if (!dbs.RST) missing.push('RST');
        if (!dbs.NRT) missing.push('NRT');
        if (!dbs.KTB) missing.push('KTB');
        if (!dbs.KYB) missing.push('KYB');

        if (loadingStatus) {
            loadingStatus.innerHTML = `⚠️ Ошибка загрузки Библии: ${missing.join(', ')}<br><span style="font-size: 12px; color: var(--text-tertiary);">Приложение продолжит работу с доступными модулями.</span>`;
            loadingStatus.style.color = 'var(--warning)';
        }

        // Wait a brief moment so the user sees the warning, then proceed anyway
        setTimeout(finalizeInit, 2000);
    } else {
        finalizeInit();
    }
}

// Expose finalizeInit to window for the "Skip" button in controller.html


async function finalizeInit() {

    // Load Songbooks
    await loadSongbooks();
    populateSongbookSelector();
    renderSongList();

    // Hide loading overlay with fade
    setTimeout(() => {
        elements.loading.style.opacity = '0';
        elements.loading.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            elements.loading.style.display = 'none';
        }, 300);
    }, 200);

    // Load saved settings into UI
    const settings = loadSettings();
    elements.fontSelect.value = settings.font;
    // Map legacy string themes to hex for the new color picker
    let hexTheme = settings.theme;
    if (hexTheme === 'blue') hexTheme = '#0f172a';
    if (hexTheme === 'black') hexTheme = '#000000';
    if (hexTheme === 'forest') hexTheme = '#052e16';

    elements.themeSelect.value = hexTheme;
    if (elements.themeHex) elements.themeHex.value = hexTheme;

    // Load custom text color
    const textColor = settings.textColor || '#ffffff';
    if (elements.textColorSelect) elements.textColorSelect.value = textColor;
    if (elements.textColorHex) elements.textColorHex.value = textColor;

    // Run the injection logic once on startup so the controller previews the current save state
    document.documentElement.style.setProperty('--text-color', textColor);
    document.documentElement.style.setProperty('--accent-color', textColor);
    if (settings.font) document.documentElement.style.setProperty('--font-main', settings.font);

    elements.sizeRange.value = settings.size;

    // Setup event listeners
    setupEventListeners();

    // Render initial history
    renderHistory(elements.historyList, loadFromHistory);

    // Init UI Modules
    initBibleUI(getDatabases, (verse) => {
        state.currentVerse = verse;
        displayPreview(verse);
        addToHistory(verse);
        renderHistory(elements.historyList, loadFromHistory);
    }, (verse) => {
        // Broadcast callback
        broadcastToDisplay();
    });

    // Init Backgounds and broadcast active
    try {
        await initBgDB();
        const activeBgId = getActiveBackgroundId();
        if (activeBgId) {
            const bgs = await loadBackgrounds();
            const activeBg = bgs.find(b => b.id === activeBgId);
            if (activeBg && typeof broadcastBackground === 'function') {
                broadcastBackground(activeBg.dataUrl);
            }
        }
    } catch (e) {
        console.warn('Failed to init backgrounds on startup:', e);
    }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Search input
    elements.input.addEventListener('keydown', handleSearch);

    // Song Search
    elements.songSearch.addEventListener('input', handleSongSearch);
    elements.songbookSelect.addEventListener('change', handleSongbookChange);

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeys);

    // Translation change
    elements.translationSelect.addEventListener('change', handleTranslationChange);

    // Settings changes
    elements.fontSelect.addEventListener('change', handleSettingsUpdate);

    // Sync color picker with HEX input
    elements.themeSelect.addEventListener('input', (e) => {
        if (elements.themeHex) elements.themeHex.value = e.target.value;
        handleSettingsUpdate();
    });
    elements.themeSelect.addEventListener('change', handleSettingsUpdate);

    if (elements.themeHex) {
        elements.themeHex.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                elements.themeSelect.value = val;
                handleSettingsUpdate();
            }
        });
    }

    // Sync Text Color picker with HEX input
    if (elements.textColorSelect) {
        elements.textColorSelect.addEventListener('input', (e) => {
            if (elements.textColorHex) elements.textColorHex.value = e.target.value;
            handleSettingsUpdate();
        });
        elements.textColorSelect.addEventListener('change', handleSettingsUpdate);
    }

    if (elements.textColorHex) {
        elements.textColorHex.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                elements.textColorSelect.value = val;
                handleSettingsUpdate();
            }
        });
    }

    elements.sizeRange.addEventListener('input', handleSettingsUpdate);

    // Note Input (Live Broadcast & Ctrl+Enter)
    initNotesUI();

    // Mobile menu toggle
    setupMobileMenu();
}

// === UI TOGGLES (SIDEBAR & MENU) ===
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const app = document.querySelector('.app');

    if (!menuToggle || !sidebar || !overlay) return;

    const toggleMenu = () => {
        if (window.innerWidth > 768) {
            // Desktop toggle via CSS Grid
            const isCollapsed = app.classList.toggle('sidebar-collapsed');
            if (sidebarToggleBtn) {
                sidebarToggleBtn.textContent = isCollapsed ? '▶' : '◀';
            }
        } else {
            // Mobile toggle via off-canvas slide
            const isOpen = sidebar.classList.toggle('open');
            overlay.classList.toggle('active', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen);
            menuToggle.textContent = isOpen ? '✕' : '☰';
        }
    };

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Sidebar Toggle
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', toggleMenu);
        // Set initial icon state
        sidebarToggleBtn.textContent = '◀';
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open') && window.innerWidth <= 768) {
            toggleMenu();
        }
    });

    // Clean up state on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                menuToggle.textContent = '☰';
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
}

// Bible Search is now handled entirely within bible-ui.js

// === GLOBAL KEYBOARD SHORTCUTS ===
function handleGlobalKeys(e) {
    // Don't trigger if user is typing in an input
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

    if (e.key === 'Escape') {
        hideFromDisplay();
        // Also close modals if open
        closeSongModal();
        closeTextSearch();
        closePresentationModal();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (state.currentMode === 'bible' && state.currentVerse) {
            broadcastToDisplay();
        } else if (state.currentMode === 'songs' && state.currentSong) {
            broadcastSong();
        } else if (state.currentMode === 'slides' && state.currentPresentation) {
            broadcastSlide();
        }
    }

    // Stanza navigation with arrows in song mode
    if (!isTyping && state.currentMode === 'songs' && state.currentSong) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            goToNextStanza();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            goToPrevStanza();
        }
    }

    // Slide navigation with arrows
    if (!isTyping && state.currentMode === 'slides' && state.currentPresentation) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            goToNextSlide();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            goToPrevSlide();
        }
    }

    // Arrow navigation (only when not typing)
    if (!isTyping) {
        if (state.currentMode === 'bible' && state.currentVerse) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextVerse();
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevVerse();
            }
        }
    }
}

// === TRANSLATION CHANGE ===
async function handleTranslationChange(e) {
    if (!state.currentVerse || !state.currentVerse.bookId) return;

    const newTranslation = e.target.value;
    const db = getDatabases()[newTranslation];

    updateStatus(elements.status, '⏳ Обновление...');

    const parsed = {
        canonicalCode: state.currentVerse.canonicalCode,
        chapter: state.currentVerse.chapter,
        verse: state.currentVerse.verse,
        bookName: state.currentVerse.bookName
    };

    const data = fetchVerse(parsed, db, newTranslation);

    if (data) {
        const editedText = getEdit(newTranslation, data.bookName, data.chapter, data.verse);
        if (editedText) {
            data.text = editedText;
        }

        state.currentVerse = data;
        displayPreview(data);
        updateStatus(elements.status, `✓ ${data.reference} (${newTranslation})`, 'success');
        addToHistory(data);
        renderHistory(elements.historyList, loadFromHistory);

        // If currently broadcasting, update display
        if (elements.status.classList.contains('broadcasting')) {
            broadcastToDisplay();
        }
    } else {
        updateStatus(elements.status, `⚠️ Нет в ${newTranslation}`, 'error');
    }
}

// === DISPLAY FUNCTIONS ===
function displayPreview(data) {
    elements.verseText.innerHTML = data.text;
    elements.verseText.classList.remove('placeholder');
    elements.verseRef.textContent = data.reference;
    elements.btnBroadcast.disabled = false;
}

function broadcastToDisplay() {
    if (!state.currentVerse) return;

    if (isDisplayAvailable()) {
        showVerse(state.currentVerse);
        updateStatus(elements.status, `📡 ${state.currentVerse.reference}`, 'broadcasting');
    } else {
        updateStatus(elements.status, '⚠️ Откройте экран', 'error');
    }
}

function hideFromDisplay() {
    hideDisplay();
    updateStatus(elements.status, '⏳ Готов');
}

// === HISTORY ===
function loadFromHistory(index) {
    if (state.currentMode !== 'bible') switchMode('bible');
    const verse = getFromHistory(index);
    if (verse) {
        state.currentVerse = verse;
        displayPreview(verse);
        broadcastToDisplay();
    }
}

// Verse Navigation was extracted to bible-ui.js

// Global bindings for HTML onclick



// === VISUAL BIBLE NAVIGATION ===
// Visual Bible Navigation was extracted to bible-ui.js

// Notes logic was extracted to notes-ui.js

// === SETTINGS ===
function toggleSettings() {
    elements.settingsModal.classList.toggle('active');

    // Auto-close mobile sidebar if it is open so the modal doesn't trigger behind it
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const menuToggle = document.getElementById('menu-toggle');

        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
            if (menuToggle) {
                menuToggle.textContent = '☰';
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }
};

function handleSettingsUpdate() {
    const settings = {
        font: elements.fontSelect.value,
        theme: elements.themeSelect.value,
        textColor: elements.textColorSelect ? elements.textColorSelect.value : '#ffffff',
        size: elements.sizeRange.value
    };

    // Immediately map the new Settings into the Controller's CSS so the local Preview Box matches the Display Monitor
    document.documentElement.style.setProperty('--text-color', settings.textColor);
    document.documentElement.style.setProperty('--accent-color', settings.textColor);

    // Apply local root font scaling
    if (settings.font) document.documentElement.style.setProperty('--font-main', settings.font);

    saveSettings(settings);
    updateDisplaySettings(settings);
}



// === EDIT MODE ===
function toggleEditMode() {
    if (!state.currentVerse) return;

    elements.verseText.style.display = 'none';
    elements.editArea.value = state.currentVerse.text;
    elements.editArea.classList.add('active');
    document.getElementById('btn-edit').style.display = 'none';
    document.getElementById('btn-save').style.display = 'inline-flex';
    document.getElementById('btn-cancel').style.display = 'inline-flex';
    elements.editArea.focus();
};

function cancelEdit() {
    elements.verseText.style.display = 'block';
    elements.editArea.classList.remove('active');
    document.getElementById('btn-edit').style.display = 'flex';
    document.getElementById('btn-save').style.display = 'none';
    document.getElementById('btn-cancel').style.display = 'none';
};

function saveVerseEdit() {
    if (!state.currentVerse) return;

    state.currentVerse.text = elements.editArea.value.trim();
    const translation = elements.translationSelect.value;
    saveEdit(translation, state.currentVerse.bookName, state.currentVerse.chapter, state.currentVerse.verse, state.currentVerse.text);
    displayPreview(state.currentVerse);
    cancelEdit();

    if (elements.status.classList.contains('broadcasting')) {
        broadcastToDisplay();
    }
};

// === DISPLAY WINDOW ===
async function launchDisplayWindow() {
    const win = await openDisplayWindow();
    setDisplayWindow(win);

    // Apply settings after slight delay
    setTimeout(handleSettingsUpdate, 1000);
};

// === HISTORY CLEAR ===
function clearHistory() {
    clearHistoryData();
    renderHistory(elements.historyList, loadFromHistory);
};


// === SONG MODE LOGIC ===
function switchMode(mode) {
    if (mode === state.currentMode) return;

    state.currentMode = mode;

    // Toggle Buttons
    elements.btnModeBible.classList.toggle('active', mode === 'bible');
    elements.btnModeSongs.classList.toggle('active', mode === 'songs');
    elements.btnModeSlides.classList.toggle('active', mode === 'slides');
    elements.btnModeBackgrounds.classList.toggle('active', mode === 'backgrounds');

    // Toggle Content
    elements.modeBible.style.display = mode === 'bible' ? 'block' : 'none';
    elements.modeSongs.style.display = mode === 'songs' ? 'block' : 'none';
    elements.modeSlides.style.display = mode === 'slides' ? 'block' : 'none';
    elements.modeBackgrounds.style.display = mode === 'backgrounds' ? 'flex' : 'none';

    // Toggle History sidebar section (only relevant for Bible mode)
    const historySection = document.getElementById('history-section');
    if (historySection) {
        historySection.style.display = mode === 'bible' ? 'block' : 'none';
    }

    if (mode === 'songs') {
        renderSongList(elements.songSearch.value, elements.songbookSelect.value);
        elements.songSearch.focus();
    } else if (mode === 'slides') {
        renderPresentationList();
    } else if (mode === 'backgrounds') {
        renderBackgroundList();
    } else {
        elements.input.focus();
    }
};
// === REGISTER SERVICE WORKER ===
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('✅ Service Worker зарегистрирован'))
        .catch(err => console.log('❌ Service Worker ошибка:', err));
}

// === END OF GLOBAL BINDINGS ===

// === PRESENTATION MODE LOGIC ===

/**
 * Open the create presentation modal
 */
function openCreatePresentationModal() {
    state.pendingSlides = [];
    elements.presTitle.value = '';
    elements.uploadPreviewGrid.innerHTML = '';
    elements.presentationModal.classList.add('active');

    // Setup drag & drop
    const dropZone = elements.slideDropZone;
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) await handleSlideFiles(files);
    };

    // Setup file input
    elements.slideFileInput.value = '';
    elements.slideFileInput.onchange = async (e) => {
        if (e.target.files.length) await handleSlideFiles(e.target.files);
    };
};

/**
 * Close the create presentation modal
 */
function closePresentationModal() {
    elements.presentationModal.classList.remove('active');
    state.pendingSlides = [];
};

/**
 * Handle files dropped or selected
 */
async function handleSlideFiles(files) {
    const status = elements.uploadStatus;
    status.style.display = 'block';
    status.textContent = 'Обработка файлов...';

    try {
        const newSlides = await processFiles(files, (msg) => {
            status.textContent = msg;
        });
        state.pendingSlides.push(...newSlides);
        renderUploadPreview();
        status.textContent = state.pendingSlides.length > 0
            ? `${state.pendingSlides.length} слайд(ов) готово`
            : '';
    } catch (e) {
        status.textContent = 'Ошибка обработки файлов';
        console.error(e);
    }

    setTimeout(() => { status.style.display = 'none'; }, 2000);
}

/**
 * Render upload preview thumbnails in modal
 */
function renderUploadPreview() {
    const grid = elements.uploadPreviewGrid;
    grid.innerHTML = '';

    state.pendingSlides.forEach((slide, index) => {
        const item = document.createElement('div');
        item.className = 'upload-preview-item';

        const img = document.createElement('img');
        img.src = slide.thumbnailDataUrl;
        img.alt = `Slide ${index + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.onclick = () => {
            state.pendingSlides.splice(index, 1);
            renderUploadPreview();
        };

        item.appendChild(img);
        item.appendChild(removeBtn);
        grid.appendChild(item);
    });
}

/**
 * Save a new presentation from the modal form
 */
async function savePresentationForm() {
    const title = elements.presTitle.value.trim();
    if (!title) {
        elements.presTitle.focus();
        return;
    }
    if (state.pendingSlides.length === 0) {
        alert('Добавьте хотя бы одно изображение');
        return;
    }

    // Re-index slide orders
    state.pendingSlides.forEach((s, i) => s.order = i);
    const category = document.getElementById('pres-category').value || 'sermons';

    await savePresentation({
        title,
        category,
        slides: state.pendingSlides
    });

    closePresentationModal();
    await renderPresentationList();
};

/**
 * Render the list of presentations in the sidebar
 */

async function renderPresentationList() {
    const list = elements.presentationsList;
    list.innerHTML = '';

    try {
        await initDB();
        let presentations = await loadPresentations();

        const filterEl = document.getElementById('pres-category-filter');
        const filterVal = filterEl ? filterEl.value : 'sermons';

        // Filter based on selected tab
        if (filterVal === 'trash') {
            presentations = presentations.filter(p => !!p.deletedAt);
        } else {
            presentations = presentations.filter(p => !p.deletedAt && p.category === filterVal);
        }

        elements.slidesCount.textContent = `${presentations.length}`;

        if (presentations.length === 0) {
            if (filterVal === 'trash') {
                list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">Корзина пуста</div>';
            } else {
                list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">Нет презентаций.<br>Нажмите ➕ Создать</div>';
            }
            return;
        }

        presentations.forEach(p => {
            const item = document.createElement('div');
            item.className = 'pres-list-item' + (state.currentPresentation && state.currentPresentation.id === p.id ? ' active' : '');

            let thumbHtml = '';
            if (p.firstThumbnail) {
                thumbHtml = `<img class="pres-list-thumb" src="${p.firstThumbnail}" alt="">`;
            } else {
                thumbHtml = '<div class="pres-list-thumb"></div>';
            }

            let actionsHtml = '';
            if (filterVal === 'trash') {
                actionsHtml = `
                    <button class="btn-icon pres-restore-btn" title="Восстановить" style="font-size: 16px; opacity: 0.8; margin-right: 4px;">♻️</button>
                    <button class="btn-icon pres-harddelete-btn" title="Удалить навсегда" style="font-size: 16px; opacity: 0.8; color: var(--error);">🗑️</button>
                `;
            } else {
                actionsHtml = `<button class="btn-icon pres-delete-btn" title="Удалить" style="font-size: 16px; opacity: 0.5; flex-shrink: 0;">🗑️</button>`;
            }

            item.innerHTML = `
                ${thumbHtml}
                <div class="pres-list-info" style="flex: 1; cursor: pointer;">
                    <div class="pres-list-title">${p.title}</div>
                    <div class="pres-list-meta">${p.slideCount} слайд(ов)</div>
                </div>
                <div style="display: flex; flex-shrink: 0;">${actionsHtml}</div>
            `;

            const infoArea = item.querySelector('.pres-list-info');
            const thumbArea = item.querySelector('.pres-list-thumb');

            if (filterVal !== 'trash') {
                // Normal click triggers preview
                infoArea.onclick = () => selectPresentation(p.id);
                if (thumbArea) thumbArea.onclick = () => selectPresentation(p.id);
                if (thumbArea) thumbArea.style.cursor = 'pointer';

                const deleteBtn = item.querySelector('.pres-delete-btn');
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await deletePresentation(p.id);
                    if (state.currentPresentation && state.currentPresentation.id === p.id) {
                        state.currentPresentation = null;
                        state.currentSlideIndex = 0;
                        elements.slidePreviewPlaceholder.style.display = 'block';
                        elements.slidePreviewImg.style.display = 'none';
                        elements.slideThumbnails.innerHTML = '';
                        elements.slideCounter.textContent = '';
                        elements.btnBroadcastSlide.disabled = true;
                    }
                    await renderPresentationList();
                };
            } else {
                // In trash
                const restoreBtn = item.querySelector('.pres-restore-btn');
                if (restoreBtn) {
                    restoreBtn.onclick = async (e) => {
                        e.stopPropagation();
                        await window.restorePresentationFromTrash(p.id);
                    };
                }
                const hardDelBtn = item.querySelector('.pres-harddelete-btn');
                if (hardDelBtn) {
                    hardDelBtn.onclick = async (e) => {
                        e.stopPropagation();
                        if (confirm('Презентация будет удалена навсегда. Продолжить?')) {
                            await window.hardDeletePresentationFromTrash(p.id);
                        }
                    };
                }
            }

            list.appendChild(item);
        });
    } catch (e) {
        console.error('Failed to load presentations:', e);
        list.innerHTML = '<div style="padding: 20px; color: var(--text-tertiary);">Ошибка загрузки</div>';
    }
}

/**
 * Select a presentation and load it
 */
async function selectPresentation(id) {
    try {
        if (state.currentPresentation && state.currentPresentation.slides) {
            state.currentPresentation.slides.forEach(s => {
                if (s._blobUrl) URL.revokeObjectURL(s._blobUrl);
            });
        }
        state.currentPresentation = await getPresentation(id);
        if (!state.currentPresentation || !state.currentPresentation.slides.length) return;

        state.currentSlideIndex = 0;
        renderCurrentSlide();
        renderSlideThumbnails();
        renderPresentationList(); // Update active state
        elements.btnBroadcastSlide.disabled = false;
    } catch (e) {
        console.error('Failed to load presentation:', e);
    }
}

/**
 * Render the currently selected slide in the preview area
 */
function getSlideUrl(slide) {
    if (slide.imageBlob) {
        if (!slide._blobUrl) {
            slide._blobUrl = URL.createObjectURL(slide.imageBlob);
        }
        return slide._blobUrl;
    }
    return slide.imageDataUrl;
}

/**
 * Render the currently selected slide in the preview area
 */
function renderCurrentSlide() {
    if (!state.currentPresentation || !state.currentPresentation.slides.length) return;

    const slide = state.currentPresentation.slides[state.currentSlideIndex];
    elements.slidePreviewPlaceholder.style.display = 'none';
    elements.slidePreviewImg.style.display = 'block';
    elements.slidePreviewImg.src = getSlideUrl(slide);
    elements.slideCounter.textContent = `${state.currentSlideIndex + 1} / ${state.currentPresentation.slides.length}`;

    // Update thumbnail active state
    const thumbs = elements.slideThumbnails.querySelectorAll('.slide-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === state.currentSlideIndex));
}

/**
 * Render slide thumbnails strip
 */
function renderSlideThumbnails() {
    const container = elements.slideThumbnails;
    container.innerHTML = '';

    if (!state.currentPresentation) return;

    state.currentPresentation.slides.forEach((slide, index) => {
        const img = document.createElement('img');
        img.className = 'slide-thumb' + (index === state.currentSlideIndex ? ' active' : '');
        img.src = slide.thumbnailDataUrl;
        img.alt = `Slide ${index + 1}`;
        img.onclick = () => {
            state.currentSlideIndex = index;
            renderCurrentSlide();
        };
        container.appendChild(img);
    });
}

/**
 * Navigate slides
 */
function goToNextSlide() {
    if (!state.currentPresentation) return;
    if (state.currentSlideIndex < state.currentPresentation.slides.length - 1) {
        state.currentSlideIndex++;
        renderCurrentSlide();
        broadcastSlide();
    }
};

function goToPrevSlide() {
    if (!state.currentPresentation) return;
    if (state.currentSlideIndex > 0) {
        state.currentSlideIndex--;
        renderCurrentSlide();
        broadcastSlide();
    }
};

/**
 * Broadcast current slide to display
 */
function broadcastSlide() {
    if (!state.currentPresentation || !state.currentPresentation.slides.length) return;
    const slide = state.currentPresentation.slides[state.currentSlideIndex];
    showSlide({
        imageBlob: slide.imageBlob,
        imageUrl: slide.imageDataUrl // fallback for old presentations
    });
};

/**
 * Delete the currently selected presentation
 */
async function deleteCurrentPresentation() {
    if (!state.currentPresentation) return;

    await deletePresentation(state.currentPresentation.id);
    state.currentPresentation = null;
    state.currentSlideIndex = 0;

    // Reset preview
    elements.slidePreviewPlaceholder.style.display = 'block';
    elements.slidePreviewImg.style.display = 'none';
    elements.slideThumbnails.innerHTML = '';
    elements.slideCounter.textContent = '';
    elements.btnBroadcastSlide.disabled = true;

    await renderPresentationList();
};

// === BACKGROUNDS LOGIC ===

async function renderBackgroundList() {
    const list = elements.bgGallery;
    list.innerHTML = '';

    try {
        await initBgDB();
        const bgs = await loadBackgrounds();
        elements.bgCount.textContent = bgs.length;

        if (bgs.length === 0) {
            list.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-tertiary);">Нет загруженных фонов</div>';
            return;
        }

        const activeId = getActiveBackgroundId();

        bgs.forEach(bg => {
            const item = document.createElement('div');
            const isActive = activeId === bg.id;

            item.className = 'bg-gallery-item' + (isActive ? ' active' : '');
            // We use background-image for the thumbnail
            item.innerHTML = `
                <div class="bg-gallery-thumb" style="background-image: url('${bg.dataUrl}'); cursor: pointer;">
                    ${isActive ? '<div class="bg-active-badge">✔️ Активно</div>' : ''}
                </div>
                <div class="bg-gallery-info">
                    <span class="bg-gallery-name" title="${bg.name}">${bg.name}</span>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-icon bg-set-btn" title="${isActive ? 'Убрать с экрана' : 'Показать на экране'}" style="color: ${isActive ? 'var(--accent)' : 'inherit'};">🖥️</button>
                        <button class="btn-icon bg-delete-btn" title="Удалить фон">🗑️</button>
                    </div>
                </div>
            `;

            // Select background via thumbnail or button
            const thumb = item.querySelector('.bg-gallery-thumb');
            const setBtn = item.querySelector('.bg-set-btn');
            thumb.onclick = () => selectBackground(bg.id);
            setBtn.onclick = (e) => {
                e.stopPropagation();
                selectBackground(bg.id);
            };

            // Delete background
            const delBtn = item.querySelector('.bg-delete-btn');
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('Удалить этот фон?')) {
                    await deleteBackground(bg.id);
                    await renderBackgroundList();
                    // If active was deleted, notify broadcast to reset
                    if (isActive) {
                        broadcastBackground(null);
                    }
                }
            };

            list.appendChild(item);
        });
    } catch (e) {
        console.error('Failed to load backgrounds:', e);
        list.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; color: var(--text-tertiary);">Ошибка загрузки фонов</div>';
    }
}

async function selectBackground(id) {
    if (getActiveBackgroundId() === id) {
        // Deselect if already active
        setActiveBackgroundId(null);
        broadcastBackground(null);
    } else {
        // Select new
        setActiveBackgroundId(id);
        const bgs = await loadBackgrounds();
        const activeBg = bgs.find(b => b.id === id);
        if (activeBg) {
            broadcastBackground(activeBg.dataUrl);
        }
    }
    await renderBackgroundList();
}

function broadcastBackground(dataUrl) {
    sendToDisplay('SET_BACKGROUND', { dataUrl: dataUrl });
}

// Background File Upload Logic
function handleBgFiles(filesArray) {
    const validExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'tif'];
    const validFiles = filesArray.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return validExts.includes(ext) || file.type.startsWith('image/');
    });

    if (validFiles.length === 0) {
        alert('Пожалуйста, выберите изображения (JPG, PNG, WebP, TIFF)');
        return;
    }

    updateStatus(elements.status, `Загрузка фонов (${validFiles.length})...`, 'info');

    let processed = 0;

    validFiles.forEach(async (file) => {
        try {
            await saveBackground(file);
        } catch (e) {
            console.error('Error saving background:', e);
        } finally {
            processed++;
            if (processed === validFiles.length) {
                updateStatus(elements.status, 'Фоны успешно загружены', 'success');
                if (state.currentMode === 'backgrounds') {
                    renderBackgroundList();
                }
            }
        }
    });
}

// Setup background drag & drop
elements.bgDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.bgDropZone.classList.add('dragover');
});
elements.bgDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    elements.bgDropZone.classList.remove('dragover');
});
elements.bgDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.bgDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleBgFiles(Array.from(e.dataTransfer.files));
    }
});
elements.bgFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleBgFiles(Array.from(e.target.files));
    }
    e.target.value = ''; // Reset
});

// === GLOBAL HELPERS ===


// === START ===
async function restorePresentationFromTrash(id) {
    if (await restorePresentation(id)) {
        await renderPresentationList();
    }
};

async function hardDeletePresentationFromTrash(id) {
    if (await hardDeletePresentation(id)) {
        await renderPresentationList();
    }
};

window.addEventListener('load', init);

// === GLOBAL EVENT DELEGATION ROUTER ===
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    // Ignore clicks that are handled inside other modals if we have complex structures,
    // but typically tracking data-action is sufficient to isolate standard actions.
    const action = btn.dataset.action;
    const argsStr = btn.dataset.args;
    const args = argsStr ? argsStr.split(',') : [];

    // Map actions to functions
    const actionMap = {
        clearHistory,
        toggleSettings,
        openDisplayWindow: launchDisplayWindow,
        switchMode,
        openTextSearch,
        openBibleNavModal,
        toggleEditMode,
        saveEdit: saveVerseEdit,
        cancelEdit,
        showNote: () => broadcastNote(),
        broadcastToDisplay,
        goToPrevVerse,
        goToNextVerse,
        hideFromDisplay,
        openAddSongModal,
        editCurrentSong,
        broadcastSong,
        goToPrevStanza,
        goToNextStanza,
        openCreatePresentationModal,
        deleteCurrentPresentation,
        broadcastSlide,
        goToPrevSlide,
        goToNextSlide,
        closeSlidesModal: closePresentationModal,
        bibleNavGoBack,
        closeBibleNavModal,
        closeTextSearch,
        insertSongTag,
        closeSongModal,
        saveSongForm,
        closePresentationModal,
        savePresentationForm,
        skipLoading: () => {
            if (window.finalizeInit) window.finalizeInit(); else { document.getElementById('loading').style.display = 'none'; }
        }
    };

    if (actionMap[action]) {
        // We handle some imported functions directly if they collide or need wrapper
        actionMap[action](...args);
    } else {
        console.warn('Click action not mapped:', action);
    }
});
