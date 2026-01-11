/**
 * history.js - Verse history management module
 * Manages search history with safe DOM manipulation
 */

import { createElement, clearChildren, appendChildren, createHistoryItem, setupHistoryDelegation } from './dom-utils.js';

const MAX_HISTORY_SIZE = 15;

// In-memory history storage
let history = [];

/**
 * Get current history
 * @returns {Array}
 */
export function getHistory() {
    return history;
}

/**
 * Add a verse to history
 * @param {Object} verseData - Verse data with reference and text
 * @returns {boolean} Whether item was added
 */
export function addToHistory(verseData) {
    // Don't add duplicates at the top
    if (history.length > 0 && history[0].reference === verseData.reference) {
        return false;
    }

    history.unshift(verseData);

    // Keep history bounded
    if (history.length > MAX_HISTORY_SIZE) {
        history.pop();
    }

    return true;
}

/**
 * Get a verse from history by index
 * @param {number} index - History index
 * @returns {Object|null}
 */
export function getFromHistory(index) {
    return history[index] || null;
}

/**
 * Clear all history
 */
export function clearHistory() {
    history = [];
}

/**
 * Render history to a container element (XSS-safe)
 * @param {HTMLElement} container - History list container
 * @param {Function} onItemClick - Callback when item is clicked
 */
export function renderHistory(container, onItemClick) {
    clearChildren(container);

    history.forEach((item, index) => {
        const historyItem = createHistoryItem(item, index);
        container.appendChild(historyItem);
    });

    // Setup event delegation for clicks
    setupHistoryDelegation(container, onItemClick);
}

/**
 * Load history from localStorage
 * @param {string} [key='bible_history'] - Storage key
 */
export function loadHistory(key = 'bible_history') {
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            history = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load history:', e);
    }
}

/**
 * Save history to localStorage
 * @param {string} [key='bible_history'] - Storage key
 */
export function saveHistory(key = 'bible_history') {
    try {
        localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save history:', e);
    }
}
