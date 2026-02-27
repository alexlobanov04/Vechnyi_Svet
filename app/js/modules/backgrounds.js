/**
 * backgrounds.js - Module for managing custom presentation backgrounds
 * Uses IndexedDB for storage of large image data URLs
 */

const DB_NAME = 'eternal_light_backgrounds';
const DB_VERSION = 1;
const STORE_NAME = 'backgrounds';
const ACTIVE_KEY = 'active_background_id';

let db = null;

export async function initDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB (Backgrounds) error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Handle image conversion. Decodes TIFF if necessary.
 * @param {File} file 
 * @returns {Promise<string>} dataUrl (PNG/JPEG)
 */
export async function fileToBackgroundDataUrl(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if ((ext === 'tiff' || ext === 'tif') && window.UTIF) {
        const arrayBuffer = await file.arrayBuffer();
        const ifds = UTIF.decode(arrayBuffer);
        if (ifds && ifds[0]) {
            UTIF.decodeImage(arrayBuffer, ifds[0]);
            const rgba = UTIF.toRGBA8(ifds[0]);

            const tempCnv = document.createElement('canvas');
            tempCnv.width = ifds[0].width;
            tempCnv.height = ifds[0].height;
            const tempCtx = tempCnv.getContext('2d');

            const imageData = new ImageData(new Uint8ClampedArray(rgba), ifds[0].width, ifds[0].height);
            tempCtx.putImageData(imageData, 0, 0);

            // Convert the decoded TIFF canvas back to a standard data URL
            return tempCnv.toDataURL('image/jpeg', 0.92);
        }
    }

    // Standard fallback for JPG, PNG, WebP, etc.
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Save a new background image
 * @param {File} file 
 * @returns {Promise<string>} The new background ID
 */
export async function saveBackground(file) {
    await initDB();
    const dataUrl = await fileToBackgroundDataUrl(file);

    const bg = {
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl,
        createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(bg);

        request.onsuccess = () => resolve(bg.id);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Load all backgrounds
 * @returns {Promise<Array>}
 */
export async function loadBackgrounds() {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const results = request.result || [];
            results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            resolve(results);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Delete a background
 * @param {string} id 
 */
export async function deleteBackground(id) {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            // Unset active if deleted
            if (getActiveBackgroundId() === id) {
                setActiveBackgroundId(null);
            }
            resolve(true);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Get background by ID
 * @param {string} id 
 * @returns {Promise<Object|null>}
 */
export async function getBackground(id) {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

// === ACTIVE BACKGROUND STATE ===

export function getActiveBackgroundId() {
    return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveBackgroundId(id) {
    if (id) {
        localStorage.setItem(ACTIVE_KEY, id);
    } else {
        localStorage.removeItem(ACTIVE_KEY);
    }
}
