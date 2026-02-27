import { fullTextSearch, parseQuery, fetchVerse, getNextVerse, getPrevVerse, getBookTitleById } from './search.js';
import { updateStatus } from './dom-utils.js';
import { addToHistory, renderHistory } from './history.js';
import { state, elements } from './state.js';
import { getEdit } from './settings.js';

let navCurrentStep = 'books'; // 'books', 'chapters', 'verses'
let navSelectedBookId = null;
let navSelectedChapter = null;

let _getDatabases = null;
let _onVerseSelect = null;
let _onVerseBroadcast = null;

export function initBibleUI(getDatabasesFn, onVerseSelectCb, onVerseBroadcastCb) {
    _getDatabases = getDatabasesFn;
    _onVerseSelect = onVerseSelectCb;
    _onVerseBroadcast = onVerseBroadcastCb;

    // Setup event delegation for Bible Nav Modal
    const navContent = document.getElementById('bible-nav-content');
    if (navContent) {
        navContent.addEventListener('click', (e) => {
            const btn = e.target.closest('.bible-nav-btn');
            if (!btn) return;

            if (btn.dataset.verseId) {
                bibleNavSelectVerse(Number(btn.dataset.bookId), Number(btn.dataset.chapterId), Number(btn.dataset.verseId));
            } else if (btn.dataset.chapterId) {
                bibleNavSelectChapter(Number(btn.dataset.bookId), Number(btn.dataset.chapterId));
            } else if (btn.dataset.bookId) {
                bibleNavSelectBook(Number(btn.dataset.bookId), btn.dataset.bookName);
            }
        });
    }

    // Setup full text search input event
    const textSearchInput = document.getElementById('text-search-input');
    if (textSearchInput) {
        textSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performTextSearch();
            }
        });
    }
}

// === MAIN SEARCH INPUT LOGIC ===
export async function handleSearch(e) {
    if (e.key !== 'Enter') return;

    const translation = elements.translationSelect.value;
    const db = _getDatabases()[translation];

    if (!db) {
        updateStatus(elements.status, `⚠️ База данных (${translation}) не загружена.`, 'error');
        return;
    }

    const query = elements.input.value.trim();
    if (!query) return;

    updateStatus(elements.status, '⏳ Поиск...');

    const parsed = parseQuery(query);
    if (!parsed) {
        updateStatus(elements.status, '❌ Ошибка запроса', 'error');
        return;
    }

    const data = fetchVerse(parsed, db, translation);

    if (data) {
        // Check for saved edits
        const editedText = getEdit(translation, data.bookName, data.chapter, data.verse);
        if (editedText) {
            data.text = editedText;
        }

        _onVerseSelect(data);

        // Ctrl+Enter broadcasts immediately
        if ((e.ctrlKey || e.metaKey) && _onVerseBroadcast) {
            _onVerseBroadcast(data);
        }
    } else {
        updateStatus(elements.status, '❌ Не найдено', 'error');
    }
}

export function goToNextVerse() {
    if (!state.currentVerse) return;

    const translation = elements.translationSelect.value;
    const db = _getDatabases()[translation];

    const nextVerse = getNextVerse(state.currentVerse, db, translation);
    if (nextVerse) {
        const editedText = getEdit(translation, nextVerse.bookName, nextVerse.chapter, nextVerse.verse);
        if (editedText) {
            nextVerse.text = editedText;
        }

        _onVerseSelect(nextVerse);

        // Let app.js decide if it should broadcast via state
        if (elements.status.classList.contains('broadcasting') && _onVerseBroadcast) {
            _onVerseBroadcast(nextVerse);
        }
    } else {
        updateStatus(elements.status, '⚠️ Конец', 'error');
    }
}

export function goToPrevVerse() {
    if (!state.currentVerse) return;

    const translation = elements.translationSelect.value;
    const db = _getDatabases()[translation];

    const prevVerse = getPrevVerse(state.currentVerse, db, translation);
    if (prevVerse) {
        const editedText = getEdit(translation, prevVerse.bookName, prevVerse.chapter, prevVerse.verse);
        if (editedText) {
            prevVerse.text = editedText;
        }

        _onVerseSelect(prevVerse);

        // Let app.js decide if it should broadcast via state
        if (elements.status.classList.contains('broadcasting') && _onVerseBroadcast) {
            _onVerseBroadcast(prevVerse);
        }
    } else {
        updateStatus(elements.status, '⚠️ Начало', 'error');
    }
}

// === FULL TEXT SEARCH ===
export function openTextSearch() {
    const modal = document.getElementById('text-search-modal');
    const input = document.getElementById('text-search-input');
    modal.classList.add('active');
    input.value = '';
    input.focus();
}

export function closeTextSearch() {
    const modal = document.getElementById('text-search-modal');
    const modalResults = document.getElementById('text-search-results');
    modalResults.innerHTML = '<div class="search-results-placeholder" style="color: var(--text-tertiary); text-align: center; padding: 40px;">Введите текст и нажмите Enter</div>';
    modal.classList.remove('active');
}

function performTextSearch() {
    const query = document.getElementById('text-search-input').value.trim();
    if (!query) return;

    const translation = elements.translationSelect.value;
    const db = _getDatabases()[translation];

    const results = fullTextSearch(query, db, translation, 30);
    renderSearchResults(results, query);
}

function renderSearchResults(results, query) {
    const container = document.getElementById('text-search-results');
    const countEl = document.getElementById('text-search-count');

    container.innerHTML = '';
    countEl.textContent = `Найдено: ${results.length}`;

    if (results.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'color: var(--text-tertiary); text-align: center; padding: 40px;';
        placeholder.textContent = 'Ничего не найдено';
        container.appendChild(placeholder);
        return;
    }

    results.forEach((verse, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.dataset.index = index;

        const refDiv = document.createElement('div');
        refDiv.className = 'search-result-ref';
        refDiv.textContent = verse.reference;

        const textDiv = document.createElement('div');
        textDiv.className = 'search-result-text';
        textDiv.innerHTML = verse.text;

        item.appendChild(refDiv);
        item.appendChild(textDiv);
        container.appendChild(item);
    });

    container.onclick = (e) => {
        const item = e.target.closest('.search-result-item');
        if (item && item.dataset.index !== undefined) {
            const verse = results[Number(item.dataset.index)];
            if (verse) {
                _onVerseSelect(verse);
                closeTextSearch();
                updateStatus(elements.status, `✓ ${verse.reference}`, 'success');
            }
        }
    };
}

// === BIBLE NAV MODAL ===
function getActiveBibleDb() {
    const translation = elements.translationSelect.value;
    return _getDatabases()[translation];
}

export function openBibleNavModal() {
    navCurrentStep = 'books';
    navSelectedBookId = null;
    navSelectedChapter = null;
    document.getElementById('bible-nav-modal').classList.add('active');
    document.getElementById('bible-nav-back').style.display = 'none';
    renderBibleNavBooks();
}

export function closeBibleNavModal() {
    document.getElementById('bible-nav-modal').classList.remove('active');
}

export function bibleNavGoBack() {
    if (navCurrentStep === 'verses') {
        navCurrentStep = 'chapters';
        navSelectedChapter = null;
        renderBibleNavChapters(navSelectedBookId);
    } else if (navCurrentStep === 'chapters') {
        navCurrentStep = 'books';
        navSelectedBookId = null;
        renderBibleNavBooks();
        document.getElementById('bible-nav-back').style.display = 'none';
    }
}

function renderBibleNavBooks() {
    const db = getActiveBibleDb();
    if (!db) {
        document.getElementById('bible-nav-content').innerHTML = '<p style="color:red; padding:20px;">База Библии не загружена.</p>';
        return;
    }

    document.getElementById('bible-nav-modal-title').textContent = 'Выберите книгу';
    let html = '';

    const lang = elements.translationSelect.value === 'KTB' ? 'kz' : elements.translationSelect.value === 'KYB' ? 'ky' : 'ru';

    // Split books into Old and New Testament
    const otBooks = db.Books.filter(b => b.BookId >= 1 && b.BookId <= 39);
    const ntBooks = db.Books.filter(b => b.BookId >= 40 && b.BookId <= 66);

    if (otBooks.length > 0) {
        html += '<div class="bible-nav-sector">';
        html += '<div class="bible-nav-sector-title">Ветхий Завет</div>';
        html += '<div class="bible-nav-grid">';
        otBooks.forEach(b => {
            const title = b.BookName || getBookTitleById(b.BookId, elements.translationSelect.value, lang);
            const safeTitle = title.replace(/"/g, '&quot;');
            html += `<div class="bible-nav-btn" data-book-id="${b.BookId}" data-book-name="${safeTitle}">${title}</div>`;
        });
        html += '</div></div>';
    }

    if (ntBooks.length > 0) {
        html += '<div class="bible-nav-sector">';
        html += '<div class="bible-nav-sector-title">Новый Завет</div>';
        html += '<div class="bible-nav-grid">';
        ntBooks.forEach(b => {
            const title = b.BookName || getBookTitleById(b.BookId, elements.translationSelect.value, lang);
            const safeTitle = title.replace(/"/g, '&quot;');
            html += `<div class="bible-nav-btn" data-book-id="${b.BookId}" data-book-name="${safeTitle}">${title}</div>`;
        });
        html += '</div></div>';
    }

    document.getElementById('bible-nav-content').innerHTML = html;
}

function bibleNavSelectBook(bookId, bookName) {
    navSelectedBookId = bookId;
    navCurrentStep = 'chapters';
    document.getElementById('bible-nav-back').style.display = 'block';
    renderBibleNavChapters(bookId, bookName);
}

function renderBibleNavChapters(bookId, bookName) {
    const db = getActiveBibleDb();
    if (!db) return;

    const book = db.Books.find(b => b.BookId === bookId);
    if (!book) return;

    if (bookName) {
        document.getElementById('bible-nav-modal-title').textContent = `${bookName} - Глава`;
    }

    let html = '<div class="bible-nav-grid numbers-grid">';
    book.Chapters.forEach(c => {
        html += `<div class="bible-nav-btn" data-book-id="${bookId}" data-chapter-id="${c.ChapterId}">${c.ChapterId}</div>`;
    });
    html += '</div>';

    document.getElementById('bible-nav-content').innerHTML = html;
}

function bibleNavSelectChapter(bookId, chapterId) {
    navSelectedChapter = chapterId;
    navCurrentStep = 'verses';
    renderBibleNavVerses(bookId, chapterId);
}

function renderBibleNavVerses(bookId, chapterId) {
    const db = getActiveBibleDb();
    if (!db) return;

    const book = db.Books.find(b => b.BookId === bookId);
    if (!book) return;

    const chapter = book.Chapters.find(c => c.ChapterId === chapterId);
    if (!chapter) return;

    const lang = elements.translationSelect.value === 'KTB' ? 'kz' : elements.translationSelect.value === 'KYB' ? 'ky' : 'ru';
    const bookName = book.BookName || getBookTitleById(bookId, elements.translationSelect.value, lang);
    document.getElementById('bible-nav-modal-title').textContent = `${bookName} ${chapterId} - Стих`;

    let html = '<div class="bible-nav-grid numbers-grid">';
    chapter.Verses.forEach(v => {
        html += `<div class="bible-nav-btn" data-book-id="${bookId}" data-chapter-id="${chapterId}" data-verse-id="${v.VerseId}">${v.VerseId}</div>`;
    });
    html += '</div>';

    document.getElementById('bible-nav-content').innerHTML = html;
}

function bibleNavSelectVerse(bookId, chapterId, verseId) {
    const lang = elements.translationSelect.value === 'KTB' ? 'kz' : elements.translationSelect.value === 'KYB' ? 'ky' : 'ru';
    const bookAbbr = getBookTitleById(bookId, elements.translationSelect.value, lang);

    elements.input.value = `${bookAbbr} ${chapterId}:${verseId}`;
    handleSearch({ key: 'Enter', ctrlKey: true });
    closeBibleNavModal();
}
