/**
 * display.js - Display window module for Eternal Light
 * Handles receiving and displaying verses from the controller
 */

// BroadcastChannel for receiving messages from controller
const channel = new BroadcastChannel('bible_display');

// DOM elements
const container = document.getElementById('display-container');
const content = document.getElementById('verse-content');
const ref = document.getElementById('verse-ref');
const idle = document.getElementById('idle');

/**
 * Handle incoming message from controller
 * @param {Object} payload - Message payload with type and data
 */
function handleMessage(payload) {
    if (!payload || !payload.type) return;

    const { type, data } = payload;

    switch (type) {
        case 'SHOW_VERSE':
            updateDisplay(data, false);
            break;
        case 'SHOW_NOTE':
            updateDisplay(data, true);
            break;
        case 'HIDE_VERSE':
            hideDisplay();
            break;
        case 'UPDATE_SETTINGS':
            applySettings(data);
            break;
    }
}

/**
 * Apply display settings (theme, font, size)
 * @param {Object} settings - Settings object
 */
function applySettings(settings) {
    if (!settings) return;

    const { font, theme, size } = settings;

    if (font) {
        document.documentElement.style.setProperty('--font-main', font);
    }

    if (size) {
        document.documentElement.style.setProperty('--font-scale', size / 100);
    }

    if (theme) {
        const bgElement = document.querySelector('.background-overlay');

        switch (theme) {
            case 'blue':
                bgElement.style.background = 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)';
                document.documentElement.style.setProperty('--accent-color', '#d4af37');
                break;
            case 'black':
                bgElement.style.background = '#000000';
                document.documentElement.style.setProperty('--accent-color', '#ffffff');
                break;
            case 'forest':
                bgElement.style.background = 'radial-gradient(circle at center, #14532d 0%, #052e16 100%)';
                document.documentElement.style.setProperty('--accent-color', '#86efac');
                break;
        }
    }
}

/**
 * Update display with verse or note content
 * @param {Object} data - Content data with text and reference
 * @param {boolean} isNote - Whether this is a note (no reference)
 */
function updateDisplay(data, isNote = false) {
    if (!data || !data.text) return;

    container.classList.remove('visible');

    setTimeout(() => {
        // Safe: using innerHTML for formatting (data sources are trusted)
        content.innerHTML = data.text;

        if (isNote) {
            ref.style.display = 'none';
            content.style.fontSize = '4vw';
        } else {
            ref.style.display = 'block';
            ref.textContent = data.reference || '';

            // Auto-size based on text length
            const length = data.text.length;
            if (length > 300) {
                content.style.fontSize = '3vw';
            } else if (length > 150) {
                content.style.fontSize = '4vw';
            } else {
                content.style.fontSize = '5vw';
            }
        }

        idle.style.display = 'none';
        container.classList.add('visible');
    }, 400);
}

/**
 * Hide display content and show idle message
 */
function hideDisplay() {
    container.classList.remove('visible');
    setTimeout(() => {
        idle.style.display = 'block';
    }, 800);
}

/**
 * Load saved settings on startup
 */
function loadSavedSettings() {
    try {
        const saved = localStorage.getItem('bible_settings');
        if (saved) {
            applySettings(JSON.parse(saved));
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

// === EVENT LISTENERS ===

// Listen to BroadcastChannel messages
channel.onmessage = (event) => handleMessage(event.data);

// Listen to postMessage from parent window (popup)
window.addEventListener('message', (event) => {
    handleMessage(event.data);
});

// Load settings on page load
window.addEventListener('load', loadSavedSettings);

// Export for testing
export { handleMessage, applySettings, updateDisplay, hideDisplay };
