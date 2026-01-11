/**
 * settings.js - Settings management module
 * Handles display settings persistence and synchronization
 */

const SETTINGS_KEY = 'bible_settings';
const EDITS_KEY = 'bible_edits';

const DEFAULT_SETTINGS = {
    font: "'Playfair Display', serif",
    theme: 'blue',
    size: 100
};

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
export function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object with font, theme, size
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

/**
 * Get saved verse edits
 * @returns {Object} Edits dictionary
 */
export function getEdits() {
    try {
        const saved = localStorage.getItem(EDITS_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load edits:', e);
    }
    return {};
}

/**
 * Save a verse edit
 * @param {string} translation - Translation code (RST, NRT, KTB)
 * @param {string} bookName - Book name
 * @param {string} chapter - Chapter number
 * @param {string} verse - Verse number/range
 * @param {string} text - Edited text
 */
export function saveEdit(translation, bookName, chapter, verse, text) {
    const edits = getEdits();
    const key = `${translation}_${bookName}_${chapter}_${verse}`;
    edits[key] = text;

    try {
        localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
    } catch (e) {
        console.error('Failed to save edit:', e);
    }
}

/**
 * Get a saved edit for a verse
 * @param {string} translation - Translation code
 * @param {string} bookName - Book name
 * @param {string} chapter - Chapter number
 * @param {string} verse - Verse number/range
 * @returns {string|null} Edited text or null
 */
export function getEdit(translation, bookName, chapter, verse) {
    const edits = getEdits();
    const key = `${translation}_${bookName}_${chapter}_${verse}`;

    // Try exact key first
    if (edits[key]) {
        return edits[key];
    }

    // Legacy key support (without translation prefix)
    const legacyKey = `${bookName}_${chapter}_${verse}`;
    if (translation === 'RST' && edits[legacyKey]) {
        return edits[legacyKey];
    }

    return null;
}

/**
 * Export all edits as JSON string
 * @returns {string} JSON export
 */
export function exportEdits() {
    return JSON.stringify(getEdits(), null, 2);
}

/**
 * Import edits from JSON string
 * @param {string} jsonString - JSON to import
 * @returns {boolean} Success
 */
export function importEdits(jsonString) {
    try {
        const newEdits = JSON.parse(jsonString);
        const currentEdits = getEdits();
        const merged = { ...currentEdits, ...newEdits };
        localStorage.setItem(EDITS_KEY, JSON.stringify(merged));
        return true;
    } catch (e) {
        console.error('Failed to import edits:', e);
        return false;
    }
}
