/**
 * app.js - Main controller application
 * Integrates all modules for the Eternal Light controller interface
 */

// Imports updated
import { parseQuery, fetchVerse, fullTextSearch, getNextVerse, getPrevVerse } from './modules/search.js';
import { showVerse, showNote, showSong, hideDisplay, updateDisplaySettings, openDisplayWindow, setDisplayWindow, isDisplayAvailable } from './modules/broadcast.js';
import { addToHistory, renderHistory, getFromHistory, clearHistory as clearHistoryData } from './modules/history.js';
import { loadSettings, saveSettings, getEdit, saveEdit } from './modules/settings.js';
import { updateStatus } from './modules/dom-utils.js';
import { loadSongbooks, getSongbooks, saveSong, searchSongs, deleteSong } from './modules/songs.js';

// === STATE ===
let currentVerse = null;
let currentSong = null;
let currentStanzas = [];   // parsed stanzas [{text, label, isChorus}]
let currentStanzaIndex = 0;
let currentMode = 'bible'; // 'bible' or 'songs'
let currentDb = null;  // Will be set after data loads

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

// === DOM ELEMENTS ===
const elements = {
    input: document.getElementById('search-input'),
    status: document.getElementById('status'),
    verseText: document.getElementById('verse-text'),
    verseRef: document.getElementById('verse-ref'),
    btnBroadcast: document.getElementById('btn-broadcast'),
    historyList: document.getElementById('history'),
    editArea: document.getElementById('edit-area'),
    noteInput: document.getElementById('note-input'),
    translationSelect: document.getElementById('translation-select'),
    fontSelect: document.getElementById('font-select'),
    themeSelect: document.getElementById('theme-select'),
    sizeRange: document.getElementById('size-range'),
    settingsModal: document.getElementById('settings-modal'),
    loading: document.getElementById('loading'),

    // Song Mode Elements
    modeBible: document.getElementById('mode-bible'),
    modeSongs: document.getElementById('mode-songs'),
    btnModeBible: document.getElementById('btn-mode-bible'),
    btnModeSongs: document.getElementById('btn-mode-songs'),
    songSearch: document.getElementById('song-search-input'),
    songbookSelect: document.getElementById('songbook-select'),
    songsList: document.getElementById('songs-list'),
    songsCount: document.getElementById('songs-count'),
    songPreviewText: document.getElementById('song-preview-text'),
    btnBroadcastSong: document.getElementById('btn-broadcast-song'),
    songModal: document.getElementById('song-modal'),
    songFormId: document.getElementById('song-id'),
    songFormNumber: document.getElementById('song-number'),
    songFormTitle: document.getElementById('song-title'),
    songFormText: document.getElementById('song-text')
};

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
            loadingStatus.textContent = `Ошибка: ${missing.join(', ')}`;
            loadingStatus.style.color = 'var(--error)';
        }
        return;
    }

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
    elements.themeSelect.value = settings.theme;
    elements.sizeRange.value = settings.size;

    // Setup event listeners
    setupEventListeners();

    // Render initial history
    renderHistory(elements.historyList, loadFromHistory);
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
    elements.themeSelect.addEventListener('change', handleSettingsUpdate);
    elements.sizeRange.addEventListener('input', handleSettingsUpdate);

    // Mobile menu toggle
    setupMobileMenu();
}

// === MOBILE MENU ===
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!menuToggle || !sidebar || !overlay) return;

    const toggleMenu = () => {
        const isOpen = sidebar.classList.toggle('open');
        overlay.classList.toggle('active', isOpen);
        menuToggle.setAttribute('aria-expanded', isOpen);
        menuToggle.textContent = isOpen ? '✕' : '☰';
    };

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            toggleMenu();
        }
    });
}

// === SEARCH HANDLER ===
async function handleSearch(e) {
    if (e.key !== 'Enter') return;

    const query = elements.input.value.trim();
    if (!query) return;

    updateStatus(elements.status, '⏳ Поиск...');

    const translation = elements.translationSelect.value;
    const db = getDatabases()[translation];
    const ktbMap = translation === 'KTB' ? getKtbBookMap() : null;

    const parsed = parseQuery(query);
    if (!parsed) {
        updateStatus(elements.status, '❌ Ошибка запроса', 'error');
        return;
    }

    const data = fetchVerse(parsed, db, translation);

    if (data) {
        // Check for saved edits
        const editedText = getEdit(translation, data.bookName, data.chapter, data.verse);
        if (editedText) {
            data.text = editedText;
        }

        currentVerse = data;
        displayPreview(data);

        updateStatus(elements.status, `✓ ${data.reference}`, 'success');
        addToHistory(data);
        renderHistory(elements.historyList, loadFromHistory);

        // Ctrl+Enter broadcasts immediately
        // Ctrl+Enter or Cmd+Enter broadcasts immediately
        if (e.ctrlKey || e.metaKey) {
            broadcastToDisplay();
        }
    } else {
        updateStatus(elements.status, '❌ Не найдено', 'error');
    }
}

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
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (currentMode === 'bible' && currentVerse) {
            broadcastToDisplay();
        } else if (currentMode === 'songs' && currentSong) {
            broadcastSong();
        }
    }

    // Stanza navigation with arrows in song mode
    if (!isTyping && currentMode === 'songs' && currentSong) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            goToNextStanza();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            goToPrevStanza();
        }
    }

    // Arrow navigation (only when not typing)
    if (!isTyping) {
        if (currentMode === 'bible' && currentVerse) {
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
    if (!currentVerse || !currentVerse.bookId) return;

    const newTranslation = e.target.value;
    const db = getDatabases()[newTranslation];

    updateStatus(elements.status, '⏳ Обновление...');

    const parsed = {
        canonicalCode: currentVerse.canonicalCode,
        chapter: currentVerse.chapter,
        verse: currentVerse.verse,
        bookName: currentVerse.bookName
    };

    const data = fetchVerse(parsed, db, newTranslation);

    if (data) {
        const editedText = getEdit(newTranslation, data.bookName, data.chapter, data.verse);
        if (editedText) {
            data.text = editedText;
        }

        currentVerse = data;
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
    if (!currentVerse) return;

    if (isDisplayAvailable()) {
        showVerse(currentVerse);
        updateStatus(elements.status, `📡 ${currentVerse.reference}`, 'broadcasting');
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
    if (currentMode !== 'bible') switchMode('bible');
    const verse = getFromHistory(index);
    if (verse) {
        currentVerse = verse;
        displayPreview(verse);
        broadcastToDisplay();
    }
}

// === VERSE NAVIGATION ===
function goToNextVerse() {
    if (!currentVerse) return;

    const translation = elements.translationSelect.value;
    const db = getDatabases()[translation];

    const nextVerse = getNextVerse(currentVerse, db, translation);
    if (nextVerse) {
        // Check for saved edits
        const editedText = getEdit(translation, nextVerse.bookName, nextVerse.chapter, nextVerse.verse);
        if (editedText) {
            nextVerse.text = editedText;
        }

        currentVerse = nextVerse;
        displayPreview(nextVerse);
        addToHistory(nextVerse);
        renderHistory(elements.historyList, loadFromHistory);
        updateStatus(elements.status, `✓ ${nextVerse.reference}`, 'success');

        // Auto-broadcast if we were already broadcasting
        if (isDisplayAvailable()) {
            broadcastToDisplay();
        }
    } else {
        updateStatus(elements.status, '⚠️ Конец', 'error');
    }
}

function goToPrevVerse() {
    if (!currentVerse) return;

    const translation = elements.translationSelect.value;
    const db = getDatabases()[translation];

    const prevVerse = getPrevVerse(currentVerse, db, translation);
    if (prevVerse) {
        // Check for saved edits
        const editedText = getEdit(translation, prevVerse.bookName, prevVerse.chapter, prevVerse.verse);
        if (editedText) {
            prevVerse.text = editedText;
        }

        currentVerse = prevVerse;
        displayPreview(prevVerse);
        addToHistory(prevVerse);
        renderHistory(elements.historyList, loadFromHistory);
        updateStatus(elements.status, `✓ ${prevVerse.reference}`, 'success');

        // Auto-broadcast if we were already broadcasting
        if (isDisplayAvailable()) {
            broadcastToDisplay();
        }
    } else {
        updateStatus(elements.status, '⚠️ Начало', 'error');
    }
}

// Global bindings for HTML onclick
window.goToNextVerse = goToNextVerse;
window.goToPrevVerse = goToPrevVerse;

// === NOTES ===
window.showNote = function () {
    const text = elements.noteInput.value.trim();
    if (!text) return;

    if (isDisplayAvailable()) {
        showNote(text);
        updateStatus(elements.status, '📡 ЗАМЕТКА', 'broadcasting');
    } else {
        updateStatus(elements.status, '⚠️ Откройте экран', 'error');
    }
};

// === SETTINGS ===
window.toggleSettings = function () {
    elements.settingsModal.classList.toggle('active');
};

function handleSettingsUpdate() {
    const settings = {
        font: elements.fontSelect.value,
        theme: elements.themeSelect.value,
        size: elements.sizeRange.value
    };

    saveSettings(settings);
    updateDisplaySettings(settings);
}

window.updateSettings = handleSettingsUpdate;

// === EDIT MODE ===
window.toggleEditMode = function () {
    if (!currentVerse) return;

    elements.verseText.style.display = 'none';
    elements.editArea.value = currentVerse.text;
    elements.editArea.classList.add('active');
    document.getElementById('btn-edit').style.display = 'none';
    document.getElementById('btn-save').style.display = 'inline-flex';
    document.getElementById('btn-cancel').style.display = 'inline-flex';
    elements.editArea.focus();
};

window.cancelEdit = function () {
    elements.verseText.style.display = 'block';
    elements.editArea.classList.remove('active');
    document.getElementById('btn-edit').style.display = 'flex';
    document.getElementById('btn-save').style.display = 'none';
    document.getElementById('btn-cancel').style.display = 'none';
};

window.saveEdit = function () {
    if (!currentVerse) return;

    currentVerse.text = elements.editArea.value.trim();
    const translation = elements.translationSelect.value;
    saveEdit(translation, currentVerse.bookName, currentVerse.chapter, currentVerse.verse, currentVerse.text);
    displayPreview(currentVerse);
    window.cancelEdit();

    if (elements.status.classList.contains('broadcasting')) {
        broadcastToDisplay();
    }
};

// === DISPLAY WINDOW ===
window.openDisplayWindow = async function () {
    const win = await openDisplayWindow();
    setDisplayWindow(win);

    // Apply settings after slight delay
    setTimeout(handleSettingsUpdate, 1000);
};

// === HISTORY CLEAR ===
window.clearHistory = function () {
    clearHistoryData();
    renderHistory(elements.historyList, loadFromHistory);
};


// === SONG MODE LOGIC ===
window.switchMode = function (mode) {
    if (mode === currentMode) return;

    currentMode = mode;

    // Toggle Buttons
    elements.btnModeBible.classList.toggle('active', mode === 'bible');
    elements.btnModeSongs.classList.toggle('active', mode === 'songs');

    // Toggle Content
    elements.modeBible.style.display = mode === 'bible' ? 'block' : 'none';
    elements.modeSongs.style.display = mode === 'songs' ? 'block' : 'none';

    // Toggle History sidebar section (only relevant for Bible mode)
    const historySection = document.getElementById('history-section');
    if (historySection) {
        historySection.style.display = mode === 'bible' ? 'block' : 'none';
    }

    if (mode === 'songs') {
        renderSongList(elements.songSearch.value, elements.songbookSelect.value);
        elements.songSearch.focus();
    } else {
        elements.input.focus();
    }
};

window.openAddSongModal = function () {
    elements.songFormId.value = '';
    elements.songFormNumber.value = '';
    elements.songFormTitle.value = '';
    elements.songFormText.value = '';

    document.getElementById('song-modal-title').textContent = '🎵 Добавить песню';
    elements.songModal.classList.add('active');
    elements.songFormNumber.focus();
};

window.closeSongModal = function () {
    elements.songModal.classList.remove('active');
};

window.saveSongForm = function () {
    const number = elements.songFormNumber.value.trim();
    const title = elements.songFormTitle.value.trim();
    const text = elements.songFormText.value.trim();
    const id = elements.songFormId.value;

    if (!title || !text) {
        alert('Введите название и текст песни');
        return;
    }

    saveSong({ id, number, title, text });

    // Refresh list
    renderSongList(elements.songSearch.value, elements.songbookSelect.value);

    closeSongModal();
};

window.editCurrentSong = function () {
    if (!currentSong) return;

    elements.songFormId.value = currentSong.id;
    elements.songFormNumber.value = currentSong.number;
    elements.songFormTitle.value = currentSong.title;
    elements.songFormText.value = currentSong.text;

    document.getElementById('song-modal-title').textContent = '✏️ Редактировать песню';
    elements.songModal.classList.add('active');
};

function handleSongSearch(e) {
    const query = e.target.value;
    const bookId = elements.songbookSelect.value;
    renderSongList(query, bookId);
}

function handleSongbookChange() {
    const query = elements.songSearch.value;
    const bookId = elements.songbookSelect.value;
    renderSongList(query, bookId);
}

function populateSongbookSelector() {
    const books = getSongbooks();
    // Keep the default 'all' option, add each book
    books.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = book.title;
        elements.songbookSelect.appendChild(option);
    });
}

function renderSongList(query = '', bookId = 'all') {
    const songs = searchSongs(query, bookId);

    elements.songsCount.textContent = `${songs.length} песен`;
    elements.songsList.innerHTML = '';

    if (songs.length === 0) {
        elements.songsList.innerHTML = '<div style="padding: 20px; color: var(--text-tertiary); text-align: center;">Нет песен</div>';
        return;
    }

    // Sort by song number (numeric if possible) then alpha
    songs.sort((a, b) => {
        const numA = parseInt(a.number);
        const numB = parseInt(b.number);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.title.localeCompare(b.title);
    });

    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (currentSong && currentSong.id === song.id) div.classList.add('active');

        const headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'song-number';
        numberSpan.textContent = song.number ? '№' + song.number : '';
        headerRow.appendChild(numberSpan);

        // Only show delete button for user-created songs
        if (song.bookId === 'user') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.style.cssText = 'width:28px; height:28px; font-size:14px; border:none; opacity:0.4;';
            deleteBtn.textContent = '🗑';
            deleteBtn.title = 'Удалить';
            deleteBtn.onclick = (e) => { e.stopPropagation(); confirmDeleteSong(song); };
            headerRow.appendChild(deleteBtn);
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'song-title';
        titleDiv.textContent = song.title;

        const previewDiv = document.createElement('div');
        previewDiv.className = 'song-preview';
        previewDiv.textContent = (song.text.split('\n')[0] || '') + '...';

        div.appendChild(headerRow);
        div.appendChild(titleDiv);
        div.appendChild(previewDiv);

        div.onclick = () => selectSong(song);
        elements.songsList.appendChild(div);
    });
}

function selectSong(song) {
    currentSong = song;

    // Parse stanzas
    currentStanzas = parseSongStanzas(song);
    currentStanzaIndex = 0;

    renderSongList(elements.songSearch.value, elements.songbookSelect.value);

    // Render song text with verse separation
    renderSongPreview(song);
    elements.songPreviewText.classList.remove('placeholder');
    elements.btnBroadcastSong.disabled = false;

    // Scroll active song into view in the list
    const activeItem = elements.songsList.querySelector('.song-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Parse song text into stanzas with labels
 */
function parseSongStanzas(song) {
    const rawStanzas = song.text.split('\n\n');
    let verseNum = 0;
    const chorusTracker = new Set();
    const result = [];

    rawStanzas.forEach(stanza => {
        const trimmed = stanza.trim();
        if (!trimmed) return;

        const isChorus = chorusTracker.has(trimmed);
        if (!isChorus) {
            chorusTracker.add(trimmed);
        }

        if (!isChorus) verseNum++;

        result.push({
            text: trimmed,
            label: isChorus ? 'Припев' : `Куплет ${verseNum}`,
            isChorus
        });
    });

    return result;
}

/**
 * Render song text with visually separated verses/choruses
 */
function renderSongPreview(song) {
    const container = elements.songPreviewText;
    container.innerHTML = '';

    currentStanzas.forEach((stanza, idx) => {
        const block = document.createElement('div');
        block.className = 'song-stanza ' + (stanza.isChorus ? 'chorus' : 'verse');
        if (idx === currentStanzaIndex) block.classList.add('active');

        // Clickable to jump to stanza
        block.style.cursor = 'pointer';
        block.addEventListener('click', () => {
            currentStanzaIndex = idx;
            highlightActiveStanza();
            broadcastCurrentStanza();
        });

        // Add label
        const label = document.createElement('div');
        label.className = 'stanza-label';
        label.textContent = stanza.label;
        block.appendChild(label);

        // Add text lines
        const textDiv = document.createElement('div');
        textDiv.className = 'stanza-text';
        textDiv.innerHTML = escapeHtmlForPreview(stanza.text).replace(/\n/g, '<br>');
        block.appendChild(textDiv);

        container.appendChild(block);
    });
}

/**
 * Highlight the active stanza in the preview
 */
function highlightActiveStanza() {
    const blocks = elements.songPreviewText.querySelectorAll('.song-stanza');
    blocks.forEach((block, idx) => {
        block.classList.toggle('active', idx === currentStanzaIndex);
    });
    // Scroll active stanza into view
    const activeBlock = blocks[currentStanzaIndex];
    if (activeBlock) {
        activeBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Broadcast only the current stanza to display
 */
function broadcastCurrentStanza() {
    if (!currentSong || !currentStanzas.length) return;
    const stanza = currentStanzas[currentStanzaIndex];
    if (!stanza) return;

    // Always try to show song (handles BroadcastChannel + Window)
    const success = showSong({
        title: currentSong.title,
        number: currentSong.number,
        text: stanza.text,
        stanzaLabel: stanza.label,
        stanzaIndex: currentStanzaIndex + 1,
        stanzaTotal: currentStanzas.length
    });

    const label = stanza.label;
    if (success || isDisplayAvailable()) {
        updateStatus(elements.status, `🎵 ${currentSong.number ? '#' + currentSong.number + ' ' : ''}${currentSong.title} — ${label}`, 'broadcasting');
    } else {
        // Even if showSong returns false (no window), we might have sent via channel.
        // We'll assume success if we are in a context where channel works, but show warning if strict.
        // For now, let's show broadcasting status but maybe with a warning if window missing?
        // Actually, sendToDisplay returns false if window missing.
        // But we want to indicate it "Sent to Network".
        updateStatus(elements.status, `📡 ${label} >> Эфир`, 'broadcasting');
    }
}

/**
 * Safe HTML escape for song preview
 */
function escapeHtmlForPreview(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Navigate to next stanza, or next song if at the end
 */
function goToNextStanza() {
    if (!currentSong || !currentStanzas.length) return;
    if (currentStanzaIndex < currentStanzas.length - 1) {
        currentStanzaIndex++;
        highlightActiveStanza();
        broadcastCurrentStanza();
    } else {
        // Move to next song
        const songs = getCurrentSongList();
        const idx = songs.findIndex(s => s.id === currentSong.id);
        if (idx < songs.length - 1) {
            selectSong(songs[idx + 1]);
            broadcastCurrentStanza();
        }
    }
}

/**
 * Navigate to previous stanza, or previous song if at the start
 */
function goToPrevStanza() {
    if (!currentSong || !currentStanzas.length) return;
    if (currentStanzaIndex > 0) {
        currentStanzaIndex--;
        highlightActiveStanza();
        broadcastCurrentStanza();
    } else {
        // Move to previous song (last stanza)
        const songs = getCurrentSongList();
        const idx = songs.findIndex(s => s.id === currentSong.id);
        if (idx > 0) {
            selectSong(songs[idx - 1]);
            currentStanzaIndex = currentStanzas.length - 1;
            highlightActiveStanza();
            broadcastCurrentStanza();
        }
    }
}

/**
 * Navigate to next song in the currently displayed list
 */
function goToNextSong() {
    const songs = getCurrentSongList();
    if (!songs.length || !currentSong) return;
    const idx = songs.findIndex(s => s.id === currentSong.id);
    if (idx < songs.length - 1) {
        selectSong(songs[idx + 1]);
    }
}

/**
 * Navigate to previous song in the currently displayed list
 */
function goToPrevSong() {
    const songs = getCurrentSongList();
    if (!songs.length || !currentSong) return;
    const idx = songs.findIndex(s => s.id === currentSong.id);
    if (idx > 0) {
        selectSong(songs[idx - 1]);
    }
}

/**
 * Get the current filtered and sorted song list
 */
function getCurrentSongList() {
    const query = elements.songSearch.value;
    const bookId = elements.songbookSelect.value;
    const songs = searchSongs(query, bookId);
    songs.sort((a, b) => {
        const numA = parseInt(a.number);
        const numB = parseInt(b.number);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.title.localeCompare(b.title);
    });
    return songs;
}

window.broadcastSong = function () {
    if (!currentSong) return;
    broadcastCurrentStanza();
};

window.goToNextSong = goToNextSong;
window.goToPrevSong = goToPrevSong;
window.goToNextStanza = goToNextStanza;
window.goToPrevStanza = goToPrevStanza;

function confirmDeleteSong(song) {
    if (!confirm(`Удалить песню "${song.title}"?`)) return;

    deleteSong(song.id);

    // Clear selection if deleted song was selected
    if (currentSong && currentSong.id === song.id) {
        currentSong = null;
        elements.songPreviewText.textContent = 'Выберите песню из списка';
        elements.songPreviewText.classList.add('placeholder');
        elements.btnBroadcastSong.disabled = true;
    }

    renderSongList(elements.songSearch.value, elements.songbookSelect.value);
}


// === REGISTER SERVICE WORKER ===
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('✅ Service Worker зарегистрирован'))
        .catch(err => console.log('❌ Service Worker ошибка:', err));
}

// === GLOBAL BINDINGS ===
// Required for onclick handlers in HTML
window.broadcastToDisplay = function () {
    if (!currentVerse) return;

    if (isDisplayAvailable()) {
        showVerse(currentVerse);
        updateStatus(elements.status, `📡 ${currentVerse.reference}`, 'broadcasting');
    } else {
        updateStatus(elements.status, '⚠️ Откройте экран', 'error');
    }
};

window.hideFromDisplay = function () {
    hideDisplay();
    updateStatus(elements.status, '⏳ Готов');
};

// === TEXT SEARCH ===
window.openTextSearch = function () {
    const modal = document.getElementById('text-search-modal');
    const input = document.getElementById('text-search-input');
    modal.classList.add('active');
    input.value = '';
    input.focus();

    // Setup search on Enter
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            performTextSearch();
        }
    };
};

window.closeTextSearch = function () {
    const modal = document.getElementById('text-search-modal');
    const modalResults = document.getElementById('text-search-results');
    modalResults.innerHTML = '<div class="search-results-placeholder" style="color: var(--text-tertiary); text-align: center; padding: 40px;">Введите текст и нажмите Enter</div>';
    modal.classList.remove('active');
};

function performTextSearch() {
    const query = document.getElementById('text-search-input').value.trim();
    if (!query) return;

    const translation = elements.translationSelect.value;
    const db = getDatabases()[translation];

    const results = fullTextSearch(query, db, translation, 30);
    renderSearchResults(results, query);
}

function renderSearchResults(results, query) {
    const container = document.getElementById('text-search-results');
    const countEl = document.getElementById('text-search-count');

    // Clear previous results
    container.innerHTML = '';
    countEl.textContent = `Найдено: ${results.length}`;

    if (results.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'color: var(--text-tertiary); text-align: center; padding: 40px;';
        placeholder.textContent = 'Ничего не найдено';
        container.appendChild(placeholder);
        return;
    }

    results.forEach((verse, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.dataset.index = index;

        const refDiv = document.createElement('div');
        refDiv.className = 'search-result-ref';
        refDiv.textContent = verse.reference; // Safe: textContent

        const textDiv = document.createElement('div');
        textDiv.className = 'search-result-text';
        textDiv.innerHTML = verse.text; // Safe: innerHTML for formatting

        item.appendChild(refDiv);
        item.appendChild(textDiv);
        container.appendChild(item);
    });

    // Event delegation for clicks
    container.onclick = (e) => {
        const item = e.target.closest('.search-result-item');
        if (item && item.dataset.index !== undefined) {
            const verse = results[Number(item.dataset.index)];
            if (verse) {
                currentVerse = verse;
                displayPreview(verse);
                addToHistory(verse);
                renderHistory(elements.historyList, loadFromHistory);
                closeTextSearch();
                updateStatus(elements.status, `✓ ${verse.reference}`, 'success');
            }
        }
    };
}

// === START ===
window.addEventListener('load', init);
