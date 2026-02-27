/**
 * search.js - Bible verse search and parsing module
 * 
 * Uses canonical book codes for universal search across translations.
 * Works with any translation that has a mapping in canonical.js.
 */

import {
    BOOK_INFO,
    TRANSLATION_MAPS,
    getCanonicalCode,
    getBookId,
    getBookTitle,
    getBookTitleById
} from './canonical.js';

// Re-export for backwards compatibility
export { getBookTitle, getBookTitleById, BOOK_INFO, TRANSLATION_MAPS };

/**
 * Parse a verse reference query string
 * @param {string} query - User input like "ин 3 16", "рим 1:1", "1 кор 13:4-8"
 * @returns {Object|null} Parsed reference with canonicalCode, or null
 */
export function parseQuery(query) {
    query = query.toLowerCase()
        .replace(/[:.,]/g, ' ')
        // Remove standard "глава", "стих" noise words
        .replace(/\b(глава|гл|главы|стих|ст|стихи)\b/g, ' ')
        // Remove Gospel prefixes: "от матфея" -> "матфея"
        .replace(/\bот\s+/g, '')
        // Remove Russian numeric suffixes: "1-я " -> "1 ", "2-е " -> "2 "
        .replace(/(\d+)(?:-?[еяй])\s+/g, '$1 ')
        // Typo corrections based on common user mistakes
        .replace(/парапалеменнон|параполеменон|парапалемилион/g, 'паралипоменон')
        .replace(/еккелисиаст/g, 'екклесиаст')
        .replace(/фесолоникийцам/g, 'фессалоникийцам')
        .replace(/песни\s+песней/g, 'песнь песней')
        .replace(/плач\s+иеремия/g, 'плач иеремии')
        .replace(/\s+/g, ' ')
        .trim();

    // The robust regex matches anything up to the last two numbers (or one number)
    // ^(.+?)\s+(\d+) matches any string until the first number that isn't attached to the start.
    const match = query.match(/^(.+?)\s+(\d+)(?:\s+([\d\-\,]+))?$/);

    if (!match) return null;

    let bookName = match[1].replace(/\s/g, '');
    let chapter = match[2];
    let verse = match[3] || "1";

    // Get canonical code from abbreviation
    const canonicalCode = getCanonicalCode(bookName);

    if (!canonicalCode) return null;

    return {
        canonicalCode,
        bookName: bookName,
        chapter,
        verse
    };
}

/**
 * Fetch verse(s) from a database using canonical code
 * @param {Object} parsed - Parsed query from parseQuery()
 * @param {Object} db - Bible database object
 * @param {string} translation - Translation code (RST, NRT, KTB)
 * @returns {Object|null} Verse data or null if not found
 */
export function fetchVerse(parsed, db, translation = 'RST') {
    if (!db || !db.Books) {
        console.error('Database not loaded');
        return null;
    }

    if (!parsed || !parsed.canonicalCode) {
        console.error('Invalid parsed query');
        return null;
    }

    try {
        // Get the correct BookId for this translation
        const bookId = getBookId(parsed.canonicalCode, translation);

        if (!bookId) {
            console.error(`No mapping for ${parsed.canonicalCode} in ${translation}`);
            return null;
        }

        const book = db.Books.find(b => b.BookId === bookId);
        if (!book) return null;

        const chapter = book.Chapters.find(c => c.ChapterId === parseInt(parsed.chapter));
        if (!chapter) return null;

        let versesList = [];

        // Handle range (e.g., 1-5)
        if (parsed.verse.includes('-')) {
            const [start, end] = parsed.verse.split('-').map(Number);
            versesList = chapter.Verses.filter(v => v.VerseId >= start && v.VerseId <= end);
        }
        // Handle comma-separated (e.g., 1,3)
        else if (parsed.verse.includes(',')) {
            const ids = parsed.verse.split(',').map(Number);
            versesList = chapter.Verses.filter(v => ids.includes(v.VerseId));
        }
        // Single verse
        else {
            const vId = parseInt(parsed.verse);
            const v = chapter.Verses.find(v => v.VerseId === vId);
            if (v) versesList = [v];
        }

        if (versesList.length > 0) {
            const text = versesList.map(v => v.Text).join(' ');

            // Use canonical title for consistency
            const lang = translation === 'KTB' ? 'kz' : translation === 'KYB' ? 'ky' : 'ru';
            const bookTitle = getBookTitle(parsed.canonicalCode, lang);

            return {
                text: text,
                reference: `${bookTitle} ${parsed.chapter}:${parsed.verse}`,
                bookName: bookTitle,
                chapter: parsed.chapter,
                verse: parsed.verse,
                canonicalCode: parsed.canonicalCode,
                bookId: bookId,
                translation: translation
            };
        }
    } catch (e) {
        console.error("Error fetching verse:", e);
    }

    return null;
}

/**
 * Fetch verse from multiple translations at once
 * @param {Object} parsed - Parsed query from parseQuery()
 * @param {Object} databases - Object with translation DBs {RST: db, NRT: db, KTB: db}
 * @param {string[]} translations - Array of translation codes to search
 * @returns {Object} Results keyed by translation
 */
export function fetchVerseMulti(parsed, databases, translations = ['RST']) {
    const results = {};

    for (const trans of translations) {
        const db = databases[trans];
        if (db) {
            results[trans] = fetchVerse(parsed, db, trans);
        }
    }

    return results;
}

/**
 * Full-text search in a database
 * @param {string} query - Text to search for
 * @param {Object} db - Bible database object
 * @param {string} translation - Translation code
 * @param {number} [limit=20] - Maximum results
 * @returns {Array} Array of matching verses
 */
export function fullTextSearch(query, db, translation = 'RST', limit = 20) {
    if (!db || !db.Books || !query.trim()) return [];

    const results = [];
    const searchTerm = query.toLowerCase().trim();
    const lang = translation === 'KTB' ? 'kz' : translation === 'KYB' ? 'ky' : 'ru';

    // Build reverse map: BookId → canonical code
    const idToCode = {};
    const map = TRANSLATION_MAPS[translation];
    if (map) {
        for (const [code, id] of Object.entries(map)) {
            idToCode[id] = code;
        }
    }

    for (const book of db.Books) {
        for (const chapter of book.Chapters) {
            for (const verse of chapter.Verses) {
                if (verse.Text.toLowerCase().includes(searchTerm)) {
                    const canonicalCode = idToCode[book.BookId];
                    // Use canonical title for consistency
                    const bookTitle = getBookTitle(canonicalCode, lang);

                    results.push({
                        text: verse.Text,
                        reference: `${bookTitle} ${chapter.ChapterId}:${verse.VerseId}`,
                        bookName: bookTitle,
                        chapter: chapter.ChapterId,
                        verse: verse.VerseId,
                        canonicalCode: canonicalCode,
                        bookId: book.BookId,
                        translation: translation
                    });

                    if (results.length >= limit) return results;
                }
            }
        }
    }

    return results;
}

// ============================================================
// VERSE NAVIGATION
// ============================================================

/**
 * Get the next verse from current position
 * @param {Object} current - Current verse data with bookId, chapter, verse
 * @param {Object} db - Bible database
 * @param {string} translation - Translation code
 * @returns {Object|null} Next verse data or null if at end
 */
export function getNextVerse(current, db, translation = 'RST') {
    if (!db || !db.Books || !current) return null;

    const book = db.Books.find(b => b.BookId === current.bookId);
    if (!book) return null;

    const chapter = book.Chapters.find(c => c.ChapterId === parseInt(current.chapter));
    if (!chapter) return null;

    const currentVerseId = parseInt(current.verse.toString().split('-')[0]);
    const lang = translation === 'KTB' ? 'kz' : translation === 'KYB' ? 'ky' : 'ru';

    // Try next verse in same chapter
    const nextVerse = chapter.Verses.find(v => v.VerseId === currentVerseId + 1);
    if (nextVerse) {
        const bookTitle = getBookTitle(current.canonicalCode, lang);
        return {
            text: nextVerse.Text,
            reference: `${bookTitle} ${chapter.ChapterId}:${nextVerse.VerseId}`,
            bookName: bookTitle,
            chapter: chapter.ChapterId,
            verse: nextVerse.VerseId,
            canonicalCode: current.canonicalCode,
            bookId: current.bookId,
            translation: translation
        };
    }

    // Try first verse of next chapter
    const nextChapter = book.Chapters.find(c => c.ChapterId === parseInt(current.chapter) + 1);
    if (nextChapter && nextChapter.Verses.length > 0) {
        const firstVerse = nextChapter.Verses[0];
        const bookTitle = getBookTitle(current.canonicalCode, lang);
        return {
            text: firstVerse.Text,
            reference: `${bookTitle} ${nextChapter.ChapterId}:${firstVerse.VerseId}`,
            bookName: bookTitle,
            chapter: nextChapter.ChapterId,
            verse: firstVerse.VerseId,
            canonicalCode: current.canonicalCode,
            bookId: current.bookId,
            translation: translation
        };
    }

    // At end of book - try first verse of next book
    const bookIndex = db.Books.findIndex(b => b.BookId === current.bookId);
    if (bookIndex < db.Books.length - 1) {
        const nextBook = db.Books[bookIndex + 1];
        if (nextBook.Chapters.length > 0 && nextBook.Chapters[0].Verses.length > 0) {
            const firstChapter = nextBook.Chapters[0];
            const firstVerse = firstChapter.Verses[0];

            // Build reverse map to find canonical code
            const idToCode = {};
            const map = TRANSLATION_MAPS[translation];
            if (map) {
                for (const [code, id] of Object.entries(map)) {
                    idToCode[id] = code;
                }
            }
            const newCanonicalCode = idToCode[nextBook.BookId];
            const bookTitle = getBookTitle(newCanonicalCode, lang);

            return {
                text: firstVerse.Text,
                reference: `${bookTitle} ${firstChapter.ChapterId}:${firstVerse.VerseId}`,
                bookName: bookTitle,
                chapter: firstChapter.ChapterId,
                verse: firstVerse.VerseId,
                canonicalCode: newCanonicalCode,
                bookId: nextBook.BookId,
                translation: translation
            };
        }
    }

    return null; // At the very end of the Bible
}

/**
 * Get the previous verse from current position
 * @param {Object} current - Current verse data with bookId, chapter, verse
 * @param {Object} db - Bible database
 * @param {string} translation - Translation code
 * @returns {Object|null} Previous verse data or null if at beginning
 */
export function getPrevVerse(current, db, translation = 'RST') {
    if (!db || !db.Books || !current) return null;

    const book = db.Books.find(b => b.BookId === current.bookId);
    if (!book) return null;

    const chapter = book.Chapters.find(c => c.ChapterId === parseInt(current.chapter));
    if (!chapter) return null;

    const currentVerseId = parseInt(current.verse.toString().split('-')[0]);
    const lang = translation === 'KTB' ? 'kz' : translation === 'KYB' ? 'ky' : 'ru';

    // Try previous verse in same chapter
    if (currentVerseId > 1) {
        const prevVerse = chapter.Verses.find(v => v.VerseId === currentVerseId - 1);
        if (prevVerse) {
            const bookTitle = getBookTitle(current.canonicalCode, lang);
            return {
                text: prevVerse.Text,
                reference: `${bookTitle} ${chapter.ChapterId}:${prevVerse.VerseId}`,
                bookName: bookTitle,
                chapter: chapter.ChapterId,
                verse: prevVerse.VerseId,
                canonicalCode: current.canonicalCode,
                bookId: current.bookId,
                translation: translation
            };
        }
    }

    // Try last verse of previous chapter
    const chapterIndex = book.Chapters.findIndex(c => c.ChapterId === parseInt(current.chapter));
    if (chapterIndex > 0) {
        const prevChapter = book.Chapters[chapterIndex - 1];
        if (prevChapter.Verses.length > 0) {
            const lastVerse = prevChapter.Verses[prevChapter.Verses.length - 1];
            const bookTitle = getBookTitle(current.canonicalCode, lang);
            return {
                text: lastVerse.Text,
                reference: `${bookTitle} ${prevChapter.ChapterId}:${lastVerse.VerseId}`,
                bookName: bookTitle,
                chapter: prevChapter.ChapterId,
                verse: lastVerse.VerseId,
                canonicalCode: current.canonicalCode,
                bookId: current.bookId,
                translation: translation
            };
        }
    }

    // At start of book - try last verse of previous book
    const bookIndex = db.Books.findIndex(b => b.BookId === current.bookId);
    if (bookIndex > 0) {
        const prevBook = db.Books[bookIndex - 1];
        if (prevBook.Chapters.length > 0) {
            const lastChapter = prevBook.Chapters[prevBook.Chapters.length - 1];
            if (lastChapter.Verses.length > 0) {
                const lastVerse = lastChapter.Verses[lastChapter.Verses.length - 1];

                // Build reverse map to find canonical code
                const idToCode = {};
                const map = TRANSLATION_MAPS[translation];
                if (map) {
                    for (const [code, id] of Object.entries(map)) {
                        idToCode[id] = code;
                    }
                }
                const newCanonicalCode = idToCode[prevBook.BookId];
                const bookTitle = getBookTitle(newCanonicalCode, lang);

                return {
                    text: lastVerse.Text,
                    reference: `${bookTitle} ${lastChapter.ChapterId}:${lastVerse.VerseId}`,
                    bookName: bookTitle,
                    chapter: lastChapter.ChapterId,
                    verse: lastVerse.VerseId,
                    canonicalCode: newCanonicalCode,
                    bookId: prevBook.BookId,
                    translation: translation
                };
            }
        }
    }

    return null; // At the very beginning of the Bible
}

// ============================================================
// BACKWARDS COMPATIBILITY
// ============================================================

// Legacy BIBLE_BOOKS mapping (deprecated, use getCanonicalCode instead)
export const BIBLE_BOOKS = (() => {
    const map = {};
    for (const [code, info] of Object.entries(BOOK_INFO)) {
        for (const abbr of info.abbr) {
            // Use RST BookIds for backwards compatibility
            map[abbr] = TRANSLATION_MAPS.RST[code];
        }
    }
    return map;
})();

// Legacy BOOK_TITLES mapping (deprecated, use getBookTitle instead)
export const BOOK_TITLES = (() => {
    const map = {};
    for (const [code, info] of Object.entries(BOOK_INFO)) {
        const bookId = TRANSLATION_MAPS.RST[code];
        map[bookId] = info.ru;
    }
    return map;
})();
