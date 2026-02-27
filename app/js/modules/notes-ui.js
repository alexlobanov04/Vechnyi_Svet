import { elements } from './state.js';
import { showNote, isDisplayAvailable } from './broadcast.js';
import { updateStatus } from './dom-utils.js';

export function initNotesUI() {
    if (elements.noteInput) {
        elements.noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                broadcastNote();
            }
        });
        elements.noteInput.addEventListener('input', () => {
            if (elements.noteLiveToggle && elements.noteLiveToggle.checked) {
                broadcastNote(true);
            }
        });
    }
}

export function broadcastNote(isLiveTyping = false) {
    const text = elements.noteInput.value.trim();

    // In live typing mode, if the text is empty, we MUST broadcast the empty text
    if (!text && !isLiveTyping) return;

    if (isDisplayAvailable()) {
        showNote(text, isLiveTyping);
        if (text) {
            updateStatus(elements.status, isLiveTyping ? '📡 ЗАМЕТКА (Эфир)' : '📡 ЗАМЕТКА', 'broadcasting');
        } else {
            updateStatus(elements.status, 'Очищено', 'success');
        }
    } else {
        if (!isLiveTyping) {
            updateStatus(elements.status, '⚠️ Откройте экран', 'error');
        }
    }
}
