/**
 * dom-utils.js - Safe DOM manipulation utilities
 * Prevents XSS by avoiding innerHTML with user content
 */

/**
 * Create an element with safe text content
 * @param {string} tag - HTML tag name
 * @param {Object} options - Element options
 * @param {string} [options.className] - CSS class(es)
 * @param {string} [options.textContent] - Safe text content
 * @param {Object} [options.dataset] - Data attributes
 * @param {Object} [options.style] - Inline styles
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);

    if (options.className) {
        el.className = options.className;
    }

    if (options.textContent !== undefined) {
        el.textContent = options.textContent; // Safe, auto-escapes
    }

    if (options.dataset) {
        Object.assign(el.dataset, options.dataset);
    }

    if (options.style) {
        Object.assign(el.style, options.style);
    }

    if (options.id) {
        el.id = options.id;
    }

    return el;
}

/**
 * Safely clear all children from an element
 * @param {HTMLElement} parent
 */
export function clearChildren(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

/**
 * Append multiple children to a parent
 * @param {HTMLElement} parent
 * @param {...HTMLElement} children
 */
export function appendChildren(parent, ...children) {
    children.forEach(child => parent.appendChild(child));
}

/**
 * Create a history item element safely
 * @param {Object} item - History item data
 * @param {number} index - Item index
 * @returns {HTMLElement}
 */
export function createHistoryItem(item, index) {
    const div = createElement('div', {
        className: 'history-item',
        dataset: { index: index.toString() }
    });

    const refDiv = createElement('div', {
        className: 'history-ref',
        textContent: item.reference
    });

    const snippetDiv = createElement('div', {
        className: 'history-snippet',
        textContent: item.text.substring(0, 40) + '...'
    });

    appendChildren(div, refDiv, snippetDiv);
    return div;
}

/**
 * Setup event delegation for history list
 * @param {HTMLElement} container - History list container
 * @param {Function} callback - Click callback with index
 */
export function setupHistoryDelegation(container, callback) {
    container.onclick = (e) => {
        const item = e.target.closest('.history-item');
        if (item && item.dataset.index !== undefined) {
            callback(Number(item.dataset.index));
        }
    };
}

/**
 * Update status pill safely
 * @param {HTMLElement} statusEl - Status element
 * @param {string} text - Status text
 * @param {string} [className] - Additional class (success, error, broadcasting)
 */
export function updateStatus(statusEl, text, className = '') {
    statusEl.textContent = text;
    statusEl.className = 'status-pill' + (className ? ' ' + className : '');
}
