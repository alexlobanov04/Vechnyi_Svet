/**
 * presentations.js - Module for managing slide presentations
 * Uses IndexedDB for storage (supports large image blobs)
 */

const DB_NAME = 'eternal_light_presentations';
const DB_VERSION = 1;
const STORE_NAME = 'presentations';

let db = null;

// === IndexedDB INIT ===

/**
 * Initialize IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
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
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// === CRUD OPERATIONS ===

/**
 * Save a presentation (create or update)
 * @param {Object} presentation - { id, title, slides: [{ id, order, imageDataUrl, thumbnailDataUrl }] }
 * @returns {Promise<string>} presentation id
 */
export async function savePresentation(presentation) {
    await initDB();

    if (!presentation.id) {
        presentation.id = crypto.randomUUID();
    }
    if (!presentation.createdAt) {
        presentation.createdAt = Date.now();
    }
    presentation.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(presentation);

        request.onsuccess = () => resolve(presentation.id);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function loadPresentations() {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = async () => {
            const now = Date.now();
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const results = [];

            for (const p of request.result) {
                // Auto-purge if deleted longer than 7 days ago
                if (p.deletedAt && (now - p.deletedAt > SEVEN_DAYS_MS)) {
                    // Fire-and-forget hard delete, we don't await because tx is readonly
                    // we'll just skip adding it to results
                    hardDeletePresentation(p.id).catch(console.error);
                    continue;
                }

                results.push({
                    id: p.id,
                    title: p.title,
                    category: p.category || 'sermons',
                    slideCount: p.slides ? p.slides.length : 0,
                    createdAt: p.createdAt,
                    deletedAt: p.deletedAt,
                    firstThumbnail: p.slides && p.slides.length > 0 ? p.slides[0].thumbnailDataUrl : null
                });
            }

            // Sort newest first
            results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            resolve(results);
        };

        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Get full presentation with all slide data
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getPresentation(id) {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Soft-delete a presentation (moves to trash)
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deletePresentation(id) {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
            const p = getReq.result;
            if (!p) {
                resolve(false);
                return;
            }
            p.deletedAt = Date.now();
            const putReq = store.put(p);
            putReq.onsuccess = () => resolve(true);
            putReq.onerror = (e) => reject(e.target.error);
        };

        getReq.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Hard delete a presentation (permanently from DB)
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function hardDeletePresentation(id) {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Restore a presentation from trash
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function restorePresentation(id) {
    await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
            const p = getReq.result;
            if (!p) {
                resolve(false);
                return;
            }
            delete p.deletedAt;
            const putReq = store.put(p);
            putReq.onsuccess = () => resolve(true);
            putReq.onerror = (e) => reject(e.target.error);
        };

        getReq.onerror = (e) => reject(e.target.error);
    });
}

// === IMAGE HELPERS ===

/**
 * Convert a File to a Data URL string
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Create a thumbnail Data URL from a full-size Data URL
 * @param {string} dataUrl - Full size image data URL
 * @param {number} maxSize - Max width/height in pixels (default 200)
 * @returns {Promise<string>} Thumbnail data URL
 */
export function createThumbnail(dataUrl, maxSize = 200) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    });
}

/**
 * Process uploaded files into slide objects
 * Routes to the appropriate processor based on file type
 * @param {FileList|File[]} files
 * @param {Function} [onProgress] - Optional callback (message) for progress updates
 * @returns {Promise<Array>} Array of { id, order, imageDataUrl, thumbnailDataUrl }
 */
export async function processFiles(files, onProgress) {
    let slides = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = file.name.toLowerCase();

        if (name.endsWith('.pdf') || file.type === 'application/pdf') {
            if (onProgress) onProgress(`Обработка PDF: ${file.name}...`);
            const pdfSlides = await processPdfFile(file, onProgress);
            slides.push(...pdfSlides);

        } else if (name.endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || name.endsWith('.ppt')) {
            alert('Извините, мы полностью убрали поддержку PowerPoint (PPTX), так как это приводило к потере оригинального дизайна.\n\nПожалуйста, сохраните вашу презентацию как PDF и загрузите этот PDF файл.');
            continue;

        } else if (file.type.startsWith('image/')) {
            const blobUrl = URL.createObjectURL(file);
            const thumbnailDataUrl = await createThumbnail(blobUrl);
            URL.revokeObjectURL(blobUrl);

            slides.push({
                id: crypto.randomUUID(),
                order: slides.length,
                imageBlob: file, // the file itself is a Blob
                thumbnailDataUrl
            });
        }
        // Other file types are silently skipped
    }

    // Re-index orders
    slides.forEach((s, idx) => s.order = idx);
    return slides;
}

// === PDF PROCESSING ===

/**
 * Process a PDF file into slide objects using pdf.js
 * @param {File} file
 * @returns {Promise<Array>} slides
 */
async function processPdfFile(file, onProgress) {
    const slides = [];

    // Load pdf.js dynamically
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
        // Fallback: try loading via dynamic import
        try {
            const mod = await import('../vendor/pdf.min.mjs');
            window.pdfjsLib = mod;
            mod.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.mjs';
            return processPdfFile(file); // retry
        } catch (e) {
            console.error('Failed to load pdf.js:', e);
            alert('Не удалось загрузить библиотеку PDF. Проверьте подключение к интернету.');
            return [];
        }
    }

    // Set worker if not set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.mjs';
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        console.log(`PDF: Processing ${totalPages} pages`);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (onProgress) onProgress(`Обработка PDF: страница ${pageNum}/${totalPages}...`);
            const page = await pdf.getPage(pageNum);

            // Render at 2x scale for good quality on projectors
            const scale = 2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;

            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
            const blobUrl = URL.createObjectURL(imageBlob);
            const thumbnailDataUrl = await createThumbnail(blobUrl);
            URL.revokeObjectURL(blobUrl);

            slides.push({
                id: crypto.randomUUID(),
                order: pageNum - 1,
                imageBlob,
                thumbnailDataUrl
            });
            console.log(`PDF: Page ${pageNum}/${totalPages} processed`);
        }
    } catch (e) {
        console.error('PDF processing error:', e);
        alert(`Ошибка обработки PDF: ${e.message}`);
    }

    return slides;
}
