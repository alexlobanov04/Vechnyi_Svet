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

    // Automatically synchronize the Controller's Mini Preview Windows across all tabs
    const miniPreviewTexts = document.querySelectorAll('.global-mini-text');
    const miniPreviewRefs = document.querySelectorAll('.global-mini-ref');

    // Process background and theme settings for the mini previews
    const previewBoxes = document.querySelectorAll('.global-mini-preview');
    if (type === 'SET_BACKGROUND') {
        previewBoxes.forEach(box => {
            // Support both payload formats: object {dataUrl: ...} or direct string URL
            const bgUrl = (data && data.dataUrl) ? data.dataUrl : (typeof data === 'string' ? data : null);
            if (bgUrl) {
                // Use full background shorthand to guarantee CSS override
                box.style.background = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${bgUrl}') center/cover no-repeat`;
            } else {
                box.style.background = 'rgba(0, 0, 0, 0.4)';
            }
        });
    } else if (type === 'UPDATE_SETTINGS' && data && data.theme) {
        previewBoxes.forEach(box => {
            let color = data.theme;
            if (color === 'blue') color = '#0f172a';
            else if (color === 'black') color = '#000000';
            else if (color === 'forest') color = '#052e16';
            box.style.backgroundColor = color;
        });
    }

    miniPreviewTexts.forEach((textEl, index) => {
        const refEl = miniPreviewRefs[index];
        if (!refEl) return;

        if (type === 'HIDE_VERSE' || !data || (!data.text && !data.imageUrl && type !== 'SHOW_SLIDE')) {
            textEl.innerHTML = 'Экран пуст';
            textEl.style.cssText = ''; // Reset slide thumbnail styles
            textEl.classList.add('placeholder');
            refEl.style.display = 'none';
        } else if (type === 'SHOW_VERSE' || type === 'SHOW_NOTE' || type === 'SHOW_SONG') {
            textEl.style.cssText = ''; // Reset slide thumbnail styles
            textEl.innerHTML = data.text ? data.text.replace(/\n/g, '<br>') : '';
            textEl.classList.remove('placeholder');
            if (data.reference) {
                refEl.textContent = data.reference;
                refEl.style.display = 'block';
            } else {
                refEl.style.display = 'none';
            }
        } else if (type === 'SHOW_SLIDE') {
            // Show actual slide thumbnail in mini preview
            let thumbUrl = null;
            if (data.imageBlob) {
                thumbUrl = URL.createObjectURL(data.imageBlob);
            } else if (data.imageUrl) {
                thumbUrl = data.imageUrl;
            }

            if (thumbUrl) {
                textEl.innerHTML = '';
                const thumbImg = document.createElement('img');
                thumbImg.src = thumbUrl;
                thumbImg.alt = 'Слайд';
                thumbImg.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:4px;';
                textEl.appendChild(thumbImg);
                textEl.style.cssText = 'padding:0;display:flex;align-items:center;justify-content:center;overflow:hidden;';
            } else {
                textEl.innerHTML = '🖼️ [Презентация]';
            }
            textEl.classList.remove('placeholder');
            refEl.style.display = 'none';
        }
    });

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
 * @param {boolean} isLiveTyping - True if this is an instant live-typing broadcast without transition
 * @returns {boolean}
 */
export function showNote(text, isLiveTyping = false) {
    return sendToDisplay('SHOW_NOTE', { text, isLiveTyping });
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
 * Show a slide on the display
 * @param {Object} slideData - { imageUrl: dataURL string }
 * @returns {boolean}
 */
export function showSlide(slideData) {
    return sendToDisplay('SHOW_SLIDE', slideData);
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
    let newWin = null;
    // Try Multi-screen API for external monitors
    if ('getScreenDetails' in window) {
        try {
            const details = await window.getScreenDetails();
            const externalScreen = details.screens.find(s => s !== details.currentScreen) || details.screens[0];
            newWin = window.open(
                'display.html?v=8',
                'Display',
                `left=${externalScreen.left},top=${externalScreen.top},width=${externalScreen.width},height=${externalScreen.height}`
            );
        } catch (e) {
            console.log('Multi-screen API not available, falling back');
        }
    }

    // Fallback to regular popup
    if (!newWin) {
        newWin = window.open('display.html?v=8', 'Display', 'width=1024,height=768');
    }

    if (!newWin) {
        alert('⚠️ Браузер заблокировал всплывающее окно трансляции. Пожалуйста, разрешите всплывающие окна для Вечного Света (нажмите на значок предупреждения в адресной строке).');
    } else {
        displayWindow = newWin;
    }

    return displayWindow;
}
