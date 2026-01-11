/**
 * app.js - Main controller application
 * Integrates all modules for the Eternal Light controller interface
 */

import { parseQuery, fetchVerse, fullTextSearch } from './modules/search.js';
import { showVerse, showNote, hideDisplay, updateDisplaySettings, openDisplayWindow, setDisplayWindow, isDisplayAvailable } from './modules/broadcast.js';
import { addToHistory, renderHistory, getFromHistory, clearHistory as clearHistoryData } from './modules/history.js';
import { loadSettings, saveSettings, getEdit, saveEdit } from './modules/settings.js';
import { updateStatus } from './modules/dom-utils.js';

// === STATE ===
let currentVerse = null;
let currentDb = null;  // Will be set after data loads

// === DATABASE REFERENCES ===
// These will be available globally after script loads
const getDatabases = () => ({
    RST: window.BIBLE_DATA,
    NRT: window.NRT_DATA,
    KTB: window.KTB_DATA
});

const getKtbBookMap = () => window.KTB_BOOK_MAP;

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
    loading: document.getElementById('loading')
};

// === INITIALIZATION ===
function init() {
    const loadingBar = document.getElementById('loading-bar');
    const loadingStatus = document.getElementById('loading-status');

    // Track loading progress
    const dbs = getDatabases();
    let loaded = 0;
    const total = 3;

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

    // Check if all data is loaded
    if (loaded < total) {
        const missing = [];
        if (!dbs.RST) missing.push('RST');
        if (!dbs.NRT) missing.push('NRT');
        if (!dbs.KTB) missing.push('KTB');

        if (loadingStatus) {
            loadingStatus.textContent = `Ошибка: ${missing.join(', ')}`;
            loadingStatus.style.color = 'var(--error)';
        }
        return;
    }

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

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeys);

    // Translation change
    elements.translationSelect.addEventListener('change', handleTranslationChange);

    // Settings changes
    elements.fontSelect.addEventListener('change', handleSettingsUpdate);
    elements.themeSelect.addEventListener('change', handleSettingsUpdate);
    elements.sizeRange.addEventListener('input', handleSettingsUpdate);
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

    const parsed = parseQuery(query, ktbMap);
    if (!parsed) {
        updateStatus(elements.status, '❌ Ошибка запроса', 'error');
        return;
    }

    const data = fetchVerse(parsed, db);

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
        if (e.ctrlKey) {
            broadcastToDisplay();
        }
    } else {
        updateStatus(elements.status, '❌ Не найдено', 'error');
    }
}

// === GLOBAL KEYBOARD SHORTCUTS ===
function handleGlobalKeys(e) {
    if (e.key === 'Escape') {
        hideFromDisplay();
    }
    if (e.ctrlKey && e.key === 'Enter' && currentVerse) {
        broadcastToDisplay();
    }
}

// === TRANSLATION CHANGE ===
async function handleTranslationChange(e) {
    if (!currentVerse || !currentVerse.bookId) return;

    const newTranslation = e.target.value;
    const db = getDatabases()[newTranslation];

    updateStatus(elements.status, '⏳ Обновление...');

    const parsed = {
        bookId: currentVerse.bookId,
        chapter: currentVerse.chapter,
        verse: currentVerse.verse,
        bookName: currentVerse.bookName
    };

    const data = fetchVerse(parsed, db);

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
    elements.verseText.textContent = data.text;
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
    const verse = getFromHistory(index);
    if (verse) {
        currentVerse = verse;
        displayPreview(verse);
        broadcastToDisplay();
    }
}

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

// === START ===
window.addEventListener('load', init);
