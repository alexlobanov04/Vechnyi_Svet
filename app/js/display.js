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
            updateDisplay(data, 'verse');
            break;
        case 'SHOW_SONG':
            updateDisplay(data, 'song');
            break;
        case 'SHOW_NOTE':
            updateDisplay(data, 'note');
            break;
        case 'SHOW_SLIDE':
            updateDisplay(data, 'slide');
            break;
        case 'HIDE_VERSE':
            hideDisplay();
            break;
        case 'UPDATE_SETTINGS':
            applySettings(data);
            break;
        case 'SET_BACKGROUND':
            setCustomBackground(data.dataUrl);
            break;
    }
}

/**
 * Apply display settings (theme, font, size)
 * @param {Object} settings - Settings object
 */
function applySettings(settings) {
    if (!settings) return;

    const { font, theme, textColor, size } = settings;

    if (font) {
        document.documentElement.style.setProperty('--font-main', font);
    }

    if (size) {
        document.documentElement.style.setProperty('--font-scale', size / 100);
    }

    if (theme) {
        const bgElement = document.querySelector('.background-overlay');

        // Handle legacy saved theme names for backward compatibility
        let color = theme;
        let accent = '#ffffff';

        if (theme === 'blue') { color = '#0f172a'; accent = '#d4af37'; }
        else if (theme === 'black') { color = '#000000'; accent = '#ffffff'; }
        else if (theme === 'forest') { color = '#052e16'; accent = '#86efac'; }

        bgElement.style.background = color;
        // Legacy themes fallback to specific accents, native hex passes through if not matching
        const legacyAccent = (theme !== color) ? accent : null;

        // Apply fallback if the theme requested its own accent color setup
        if (legacyAccent && !textColor) {
            document.documentElement.style.setProperty('--accent-color', legacyAccent);
        }
    }

    // Native hex will use the user's selected textColor for both main text and accents globally
    const finalTextColor = textColor || '#ffffff';
    document.documentElement.style.setProperty('--text-color', finalTextColor);

    // Always map the text color to the accent variables unless legacy overrides were hit above
    if (textColor) {
        document.documentElement.style.setProperty('--accent-color', textColor);
    }
}

/**
 * Update display with verse or note content
 * @param {Object} data - Content data with text and reference
 * @param {string} mode - 'verse', 'note', or 'song'
 */
/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const displayStrategy = {
    song: (data, content, ref) => {
        content.innerHTML = escapeHtml(data.text).replace(/\n/g, '<br>');
        ref.style.display = 'none';
        ref.style.visibility = 'hidden';
        ref.textContent = '';
        ref.innerHTML = '';

        const textLength = data.text.length;
        if (textLength > 200) content.style.fontSize = '4vw';
        else if (textLength > 100) content.style.fontSize = '5vw';
        else content.style.fontSize = '6vw';

        content.style.whiteSpace = 'normal';
        content.style.textAlign = 'center';
    },

    slide: (data, content, ref) => {
        content.innerHTML = '';
        ref.style.display = 'none';
        ref.textContent = '';

        // Remove any previous full-screen slide from body
        const oldSlide = document.getElementById('fullscreen-slide');
        if (oldSlide) oldSlide.remove();

        const img = document.createElement('img');
        img.id = 'fullscreen-slide';

        // Clean up old object URLs to prevent memory leaks
        if (window._currentSlideBlobUrl) {
            URL.revokeObjectURL(window._currentSlideBlobUrl);
            window._currentSlideBlobUrl = null;
        }

        if (data.imageBlob) {
            window._currentSlideBlobUrl = URL.createObjectURL(data.imageBlob);
            img.src = window._currentSlideBlobUrl;
        } else if (data.imageUrl) {
            img.src = data.imageUrl;
        }

        img.alt = 'Slide';

        // Full-screen styles — appended to body to avoid #display-container's
        // CSS transform breaking position:fixed
        img.style.cssText = 'width:100vw;height:100vh;object-fit:contain;position:fixed;top:0;left:0;z-index:100;background:#000;';

        // Append directly to body (not inside #display-container!)
        document.body.appendChild(img);

        // Hide the text container
        const container = document.getElementById('display-container');
        if (container) container.style.display = 'none';
    },

    note: (data, content, ref) => {
        content.innerHTML = escapeHtml(data.text);
        ref.style.display = 'none';
        content.style.fontSize = '4vw';
        content.style.whiteSpace = 'pre-wrap';
        content.style.textAlign = 'center';
    },

    verse: (data, content, ref) => {
        content.innerHTML = data.text; // Verses often arrive as pre-formatted HTML 
        ref.style.display = 'block';
        ref.textContent = data.reference || '';

        const length = data.text.length;
        if (length > 300) {
            content.style.fontSize = '3vw';
        } else if (length > 150) {
            content.style.fontSize = '4vw';
        } else {
            content.style.fontSize = '5vw';
        }
        content.style.whiteSpace = 'normal';
        content.style.textAlign = 'left';
    }
};

function updateDisplay(data, mode = 'verse') {
    if (!data) return;

    // Fast-path for live note typing to avoid flashing animations
    if (data.isLiveTyping && mode === 'note') {
        container.style.transition = 'none'; // Lock out the 0.8s slide transition
        content.style.transition = 'none'; // Lock out the font-size transition

        // If text is fully erased during live broadcast, clear instantly without fade-out
        if (!data.text) {
            content.innerHTML = '';
            container.classList.remove('visible');
            idle.style.display = 'block';
            return;
        }

        displayStrategy.note(data, content, ref);
        idle.style.display = 'none';
        container.classList.add('visible');
        return;
    }

    // Slides use imageUrl instead of text
    if (mode !== 'slide' && !data.text) return;

    // Restore smooth transitions for normal projection
    container.style.transition = '';
    content.style.transition = '';

    container.classList.remove('visible');

    setTimeout(() => {
        // Clean up any fullscreen slide from body
        const oldSlide = document.getElementById('fullscreen-slide');
        if (oldSlide) oldSlide.remove();
        // Restore display container if it was hidden by slide mode
        container.style.display = '';

        // Reset all inline styles to prevent leakage between modes
        content.style.fontSize = '';
        content.style.whiteSpace = '';
        content.style.textAlign = '';
        ref.style.display = '';

        // Execute rendering strategy
        const renderer = displayStrategy[mode] || displayStrategy.verse;
        renderer(data, content, ref);

        idle.style.display = 'none';
        container.classList.add('visible');
    }, 400);
}

/**
 * Hide display content and show idle message
 */
function hideDisplay() {
    // Clean up any fullscreen slide from body
    const oldSlide = document.getElementById('fullscreen-slide');
    if (oldSlide) oldSlide.remove();
    // Restore display container if it was hidden by slide mode
    container.style.display = '';

    // Restore transitions for smooth fade out
    container.style.transition = '';
    content.style.transition = '';

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
export { handleMessage, applySettings, updateDisplay, hideDisplay }

/**
 * Handle custom background images
 * @param {string|null} dataUrl
 */
function setCustomBackground(dataUrl) {
    const overlay = document.querySelector('.background-overlay');
    if (!overlay) return;

    if (dataUrl) {
        // Set custom background
        overlay.style.backgroundImage = `url('${dataUrl}')`;
        overlay.style.backgroundSize = 'cover';
        overlay.style.backgroundPosition = 'center';
        overlay.style.backgroundRepeat = 'no-repeat';
        // Force opacity and dark overlay slightly if needed, or just let CSS .background-overlay handle the ::after tint
        overlay.style.opacity = '1';
    } else {
        // Remove custom background and fallback to default theme color
        overlay.style.backgroundImage = '';
        overlay.style.backgroundSize = '';
        overlay.style.backgroundPosition = '';
        overlay.style.backgroundRepeat = '';
    }
};
