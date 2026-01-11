/**
 * search.js - Bible verse search and parsing module
 * Handles verse references parsing for Russian and Kazakh
 */

// Russian Bible book name -> ID mapping
export const BIBLE_BOOKS = {
    "быт": 1, "бытие": 1,
    "исх": 2, "исход": 2,
    "лев": 3, "левит": 3,
    "чис": 4, "числа": 4,
    "вт": 5, "втор": 5, "второзаконие": 5,
    "иис": 6, "нав": 6, "иисуснавин": 6,
    "суд": 7, "судьи": 7,
    "руф": 8, "руфь": 8,
    "1цар": 9, "1-яцарств": 9,
    "2цар": 10, "2-яцарств": 10,
    "3цар": 11, "3-яцарств": 11,
    "4цар": 12, "4-яцарств": 12,
    "1пар": 13, "1-япаралипоменон": 13,
    "2пар": 14, "2-япаралипоменон": 14,
    "ездр": 15, "ездра": 15,
    "неем": 16, "неемия": 16,
    "есф": 17, "есфирь": 17,
    "иов": 18,
    "пс": 19, "псалтирь": 19, "псалом": 19,
    "пр": 20, "притч": 20, "притчи": 20,
    "еккл": 21, "экклезиаст": 21,
    "песн": 22, "песнь": 22,
    "ис": 23, "исаия": 23,
    "иер": 24, "иеремия": 24,
    "плач": 25,
    "иез": 26, "иезекииль": 26,
    "дан": 27, "даниил": 27,
    "ос": 28, "осия": 28,
    "иоиль": 29,
    "ам": 30, "амос": 30,
    "авд": 31, "авдий": 31,
    "иона": 32,
    "мих": 33, "михея": 33,
    "наум": 34,
    "авв": 35, "аввакум": 35,
    "соф": 36, "софония": 36,
    "агг": 37, "аггей": 37,
    "зах": 38, "захария": 38,
    "мал": 39, "малахия": 39,
    "мф": 40, "мт": 40, "матфея": 40, "матфей": 40,
    "мк": 41, "марка": 41, "марк": 41,
    "лк": 42, "луки": 42, "лук": 42,
    "ин": 43, "иоанна": 43, "иоанн": 43,
    "деян": 44, "деяния": 44,
    "иак": 45, "иакова": 45,
    "1пет": 46, "1-епетра": 46,
    "2пет": 47, "2-епетра": 47,
    "1ин": 48, "1-еиоанна": 48,
    "2ин": 49, "2-еиоанна": 49,
    "3ин": 50, "3-еиоанна": 50,
    "иуд": 51, "иуды": 51,
    "рим": 52, "римлянам": 52,
    "1кор": 53, "1-екоринфянам": 53,
    "2кор": 54, "2-екоринфянам": 54,
    "гал": 55, "галатам": 55,
    "еф": 56, "ефесянам": 56,
    "флп": 57, "филиппийцам": 57,
    "кол": 58, "колоссянам": 58,
    "1фес": 59, "1-ефессалоникийцам": 59,
    "2фес": 60, "2-ефессалоникийцам": 60,
    "1тим": 61, "1-етимофею": 61,
    "2тим": 62, "2-етимофею": 62,
    "тит": 63, "титу": 63,
    "флм": 64, "филимону": 64,
    "евр": 65, "евреям": 65,
    "откр": 66, "откровение": 66
};

// Book ID -> Russian title mapping
export const BOOK_TITLES = {
    1: "Бытие", 2: "Исход", 3: "Левит", 4: "Числа", 5: "Второзаконие",
    6: "Иисус Навин", 7: "Судьи", 8: "Руфь", 9: "1-я Царств", 10: "2-я Царств",
    11: "3-я Царств", 12: "4-я Царств", 13: "1-я Паралипоменон", 14: "2-я Паралипоменон",
    15: "Ездра", 16: "Неемия", 17: "Есфирь", 18: "Иов", 19: "Псалтирь", 20: "Притчи",
    21: "Екклесиаст", 22: "Песнь Песней", 23: "Исаия", 24: "Иеремия", 25: "Плач Иеремии",
    26: "Иезекииль", 27: "Даниил", 28: "Осия", 29: "Иоиль", 30: "Амос", 31: "Авдий",
    32: "Иона", 33: "Михей", 34: "Наум", 35: "Аввакум", 36: "Софония", 37: "Аггей",
    38: "Захария", 39: "Малахия", 40: "От Матфея", 41: "От Марка", 42: "От Луки",
    43: "От Иоанна", 44: "Деяния", 45: "Иакова", 46: "1-е Петра", 47: "2-е Петра",
    48: "1-е Иоанна", 49: "2-е Иоанна", 50: "3-е Иоанна", 51: "Иуды", 52: "Римлянам",
    53: "1-е Коринфянам", 54: "2-е Коринфянам", 55: "Галатам", 56: "Ефесянам",
    57: "Филиппийцам", 58: "Колоссянам", 59: "1-е Фессалоникийцам", 60: "2-е Фессалоникийцам",
    61: "1-е Тимофею", 62: "2-е Тимофею", 63: "Титу", 64: "Филимону", 65: "Евреям", 66: "Откровение"
};

/**
 * Get book title by ID, optionally from a custom database
 * @param {number} id - Book ID (1-66)
 * @param {Object} [db] - Optional database with BookName in Books
 * @returns {string} Book title
 */
export function getBookTitle(id, db = null) {
    if (db && db.Books) {
        const book = db.Books.find(b => b.BookId === id);
        if (book && book.BookName) {
            return book.BookName;
        }
    }
    return BOOK_TITLES[id] || "Библия";
}

/**
 * Parse a verse reference query string
 * Supports formats: "ин 3 16", "1 кор 13:4-8", "мф 5:3-10"
 * @param {string} query - User input query
 * @param {Object} [ktbBookMap] - Optional Kazakh book name map
 * @returns {Object|null} Parsed reference or null if invalid
 */
export function parseQuery(query, ktbBookMap = null) {
    query = query.toLowerCase().replace(/[:]/g, ' ').replace(/\s+/g, ' ').trim();

    // Regex for book names like "1 кор" or "ин"
    const match = query.match(/^(\d?\s?[а-яё]+)\s+(\d+)\s*([\d\-\,]*)$/);

    if (!match) return null;

    let bookName = match[1].replace(/\s/g, '');
    let chapter = match[2];
    let verse = match[3] || "1";

    // Try Russian mapping first
    let bookId = BIBLE_BOOKS[bookName];

    // Try Kazakh mapping if not found and available
    if (!bookId && ktbBookMap) {
        bookId = ktbBookMap[bookName];
    }

    if (!bookId) return null;

    return {
        bookId,
        bookName: bookName,
        chapter,
        verse
    };
}

/**
 * Fetch verse(s) from a database
 * @param {Object} parsed - Parsed query from parseQuery()
 * @param {Object} db - Bible database object
 * @returns {Object|null} Verse data or null if not found
 */
export function fetchVerse(parsed, db) {
    if (!db || !db.Books) {
        console.error('Database not loaded');
        return null;
    }

    try {
        const book = db.Books.find(b => b.BookId === parsed.bookId);
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
            const bookNameTitle = book.BookName || getBookTitle(parsed.bookId);

            return {
                text: text,
                reference: `${bookNameTitle} ${parsed.chapter}:${parsed.verse}`,
                bookName: bookNameTitle,
                chapter: parsed.chapter,
                verse: parsed.verse,
                bookId: parsed.bookId
            };
        }
    } catch (e) {
        console.error("Error fetching verse:", e);
    }

    return null;
}

/**
 * Full-text search in a database
 * @param {string} query - Text to search for
 * @param {Object} db - Bible database object
 * @param {number} [limit=20] - Maximum results
 * @returns {Array} Array of matching verses
 */
export function fullTextSearch(query, db, limit = 20) {
    if (!db || !db.Books || !query.trim()) return [];

    const results = [];
    const searchTerm = query.toLowerCase().trim();

    for (const book of db.Books) {
        for (const chapter of book.Chapters) {
            for (const verse of chapter.Verses) {
                if (verse.Text.toLowerCase().includes(searchTerm)) {
                    results.push({
                        text: verse.Text,
                        reference: `${book.BookName || getBookTitle(book.BookId)} ${chapter.ChapterId}:${verse.VerseId}`,
                        bookName: book.BookName || getBookTitle(book.BookId),
                        chapter: chapter.ChapterId,
                        verse: verse.VerseId,
                        bookId: book.BookId
                    });

                    if (results.length >= limit) return results;
                }
            }
        }
    }

    return results;
}
