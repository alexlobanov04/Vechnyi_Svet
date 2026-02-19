/**
 * songs.js - Logic for managing songs and songbooks
 */

// Key for LocalStorage
const STORAGE_KEY_SONGS = 'eternal_light_user_songs';

// In-memory cache
let songbooks = [];
let allSongs = [];

// === DATA STRUCTURES ===

/**
 * Represents a collection of songs (e.g., "Pesn Vozrozhdeniya")
 */
class Songbook {
    constructor(id, title, lang = 'ru', type = 'static') {
        this.id = id;
        this.title = title;
        this.lang = lang;
        this.type = type; // 'static' or 'local'
        this.songs = [];
    }
}

/**
 * Represents a single song
 */
class Song {
    constructor(id, bookId, number, title, text) {
        this.id = id;
        this.bookId = bookId;
        this.number = number;
        this.title = title;
        this.text = text;

        // Normalized for search
        this.searchString = `${number} ${title} ${text}`.toLowerCase().replace(/[^\w\sа-яёүөң]/g, '');
    }
}

// === PUBLIC API ===

/**
 * Loads all songbooks (static from SONGS_DATA + user-defined)
 */
export async function loadSongbooks() {
    songbooks = [];
    allSongs = [];

    // 1. Load Static Songbooks from window.SONGS_DATA
    if (window.SONGS_DATA && Array.isArray(window.SONGS_DATA)) {
        for (const bookData of window.SONGS_DATA) {
            const book = new Songbook(bookData.id, bookData.title, bookData.lang || 'ru', 'static');
            book.songs = (bookData.songs || []).map(s =>
                new Song(`${bookData.id}_${s.number}`, bookData.id, s.number, s.title, s.text)
            );
            songbooks.push(book);
            allSongs.push(...book.songs);
        }
        console.log(`📚 Loaded ${songbooks.length} songbooks, ${allSongs.length} songs from SONGS_DATA`);
    }

    // 2. Load User Songbook from localStorage
    let userBook = new Songbook('user', 'Мои Песни', 'ru', 'local');

    try {
        const stored = localStorage.getItem(STORAGE_KEY_SONGS);
        if (stored) {
            const parsed = JSON.parse(stored);
            userBook.songs = parsed.map(s => new Song(s.id, 'user', s.number, s.title, s.text));
        }
    } catch (e) {
        console.error('Error loading user songs:', e);
    }

    songbooks.push(userBook);
    allSongs.push(...userBook.songs);

    return songbooks;
}

/**
 * Returns all available songbooks
 */
export function getSongbooks() {
    return songbooks;
}

/**
 * Saves a user song to LocalStorage
 * @param {object} songData - { id, number, title, text }
 */
export function saveSong(songData) {
    const userBook = songbooks.find(sb => sb.id === 'user');
    if (!userBook) return false;

    let song;

    // Update existing or Create new
    if (songData.id) {
        song = userBook.songs.find(s => s.id === songData.id);
        if (song) {
            song.number = songData.number;
            song.title = songData.title;
            song.text = songData.text;
            song.searchString = normalize(song);
        }
    }

    if (!song) {
        const newId = crypto.randomUUID();
        song = new Song(newId, 'user', songData.number, songData.title, songData.text);
        userBook.songs.push(song);
    }

    // Persist
    persistUserSongs(userBook.songs);

    // Update cache
    allSongs = songbooks.flatMap(sb => sb.songs);

    return song;
}

/**
 * Deletes a user song
 */
export function deleteSong(songId) {
    const userBook = songbooks.find(sb => sb.id === 'user');
    if (!userBook) return false;

    const index = userBook.songs.findIndex(s => s.id === songId);
    if (index > -1) {
        userBook.songs.splice(index, 1);
        persistUserSongs(userBook.songs);
        allSongs = songbooks.flatMap(sb => sb.songs);
        return true;
    }
    return false;
}

/**
 * Search songs by title, number, or lyrics
 * @param {string} query - search text
 * @param {string} [bookId] - optional songbook ID filter ('all' or undefined = all books)
 */
export function searchSongs(query, bookId) {
    // Determine the pool to search from
    let pool = allSongs;
    if (bookId && bookId !== 'all') {
        pool = allSongs.filter(s => s.bookId === bookId);
    }

    if (!query || !query.trim()) return [...pool];

    const normalizedQuery = query.trim().toLowerCase().replace(/[^\w\sа-яёүөң]/g, '');

    return pool.filter(song => {
        // Exact match on number
        if (song.number === query.trim()) return true;

        // Match in title or text
        return song.searchString.includes(normalizedQuery);
    });
}

// === PRIVATE HELPERS ===

function persistUserSongs(songs) {
    try {
        // Only save minimal data
        const data = songs.map(s => ({
            id: s.id,
            number: s.number,
            title: s.title,
            text: s.text
        }));
        localStorage.setItem(STORAGE_KEY_SONGS, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save songs:', e);
    }
}

function normalize(song) {
    return `${song.number} ${song.title} ${song.text}`.toLowerCase().replace(/[^\w\sа-яёүөң]/g, '');
}
