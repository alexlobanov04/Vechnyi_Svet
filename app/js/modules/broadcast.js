/**
 * broadcast.js - Cross-window communication module
 * Handles communication between controller and display windows
 */

// BroadcastChannel for same-origin communication
export const channel = new BroadcastChannel('bible_display');

// Reference to display window (popup)
let displayWindow = null;

/**
 * Set the display window reference
 * @param {Window} win - Display window object
 */
export function setDisplayWindow(win) {
    displayWindow = win;
}

/**
 * Get the display window reference
 * @returns {Window|null}
 */
export function getDisplayWindow() {
    return displayWindow;
}

/**
 * Check if display window is available
 * @returns {boolean}
 */
export function isDisplayAvailable() {
    return displayWindow && !displayWindow.closed;
}

/**
 * Send a message to the display window
 * @param {string} type - Message type (SHOW_VERSE, HIDE_VERSE, etc.)
 * @param {Object} [data] - Message data
 * @returns {boolean} Whether the message was sent
 */
export function sendToDisplay(type, data = null) {
    const payload = { type, data };

    // Try BroadcastChannel first
    channel.postMessage(payload);

    // Also try postMessage for popup window
    if (isDisplayAvailable()) {
        displayWindow.postMessage(payload, '*');
        return true;
    }

    return false;
}

/**
 * Show a verse on the display
 * @param {Object} verseData - Verse data with text and reference
 * @returns {boolean}
 */
export function showVerse(verseData) {
    return sendToDisplay('SHOW_VERSE', verseData);
}

/**
 * Show a note on the display
 * @param {string} text - Note text
 * @returns {boolean}
 */
export function showNote(text) {
    return sendToDisplay('SHOW_NOTE', { text });
}

/**
 * Show a song on the display
 * @param {Object} songData - Song data
 * @returns {boolean}
 */
export function showSong(songData) {
    return sendToDisplay('SHOW_SONG', songData);
}

/**
 * Hide the current display content
 * @returns {boolean}
 */
export function hideDisplay() {
    return sendToDisplay('HIDE_VERSE');
}

/**
 * Update display settings
 * @param {Object} settings - Settings object with font, theme, size
 * @returns {boolean}
 */
export function updateDisplaySettings(settings) {
    return sendToDisplay('UPDATE_SETTINGS', settings);
}

/**
 * Open the display window
 * Uses Multi-screen API if available for external monitors
 * @returns {Promise<Window>}
 */
export async function openDisplayWindow() {
    // Try Multi-screen API for external monitors
    if ('getScreenDetails' in window) {
        try {
            const details = await window.getScreenDetails();
            const externalScreen = details.screens.find(s => s !== details.currentScreen) || details.screens[0];
            displayWindow = window.open(
                'display.html',
                'Display',
                `left=${externalScreen.left},top=${externalScreen.top},width=${externalScreen.width},height=${externalScreen.height}`
            );
            return displayWindow;
        } catch (e) {
            console.log('Multi-screen API not available, falling back');
        }
    }

    // Fallback to regular popup
    displayWindow = window.open('display.html', 'Display', 'width=1024,height=768');
    return displayWindow;
}
