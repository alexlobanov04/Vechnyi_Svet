import { state, elements } from './state.js';
import { getSongbooks, saveSong, searchSongs, deleteSong } from './songs.js';
import { updateStatus } from './dom-utils.js';
import { showSong, isDisplayAvailable } from './broadcast.js';

export function openAddSongModal() {
    elements.songFormId.value = '';
    elements.songFormNumber.value = '';
    elements.songFormTitle.value = '';
    elements.songFormText.value = '';

    document.getElementById('song-modal-title').textContent = '🎵 Добавить песню';
    elements.songModal.classList.add('active');
    elements.songFormNumber.focus();
}

export function closeSongModal() {
    elements.songModal.classList.remove('active');
}

export function insertSongTag(tag) {
    const textarea = elements.songFormText;
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Auto-number verses
    let insertion = tag;
    if (tag === '[Куплет]') {
        const verseCount = (text.match(/\[Куплет/g) || []).length;
        insertion = `[Куплет ${verseCount + 1}]`;
    }

    const before = text.substring(0, start);
    const after = text.substring(end);

    const prefix = (before === '' || before.endsWith('\n\n')) ? '' : (before.endsWith('\n') ? '\n' : '\n\n');
    const suffix = (after === '' || after.startsWith('\n\n')) ? '\n' : (after.startsWith('\n') ? '' : '\n\n');

    const newText = prefix + insertion + suffix;
    textarea.value = before + newText + after;

    textarea.focus();
    const newCursorPos = start + newText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
}

export function saveSongForm() {
    const number = elements.songFormNumber.value.trim();
    const title = elements.songFormTitle.value.trim();
    const text = elements.songFormText.value.trim();
    const id = elements.songFormId.value;

    if (!title || !text) {
        alert('Введите название и текст песни');
        return;
    }

    saveSong({ id, number, title, text });

    // Refresh list
    renderSongList(elements.songSearch.value, elements.songbookSelect.value);
    closeSongModal();
}

export function editCurrentSong() {
    if (!state.currentSong) return;

    elements.songFormId.value = state.currentSong.id;
    elements.songFormNumber.value = state.currentSong.number;
    elements.songFormTitle.value = state.currentSong.title;
    elements.songFormText.value = state.currentSong.text;

    document.getElementById('song-modal-title').textContent = '✏️ Редактировать песню';
    elements.songModal.classList.add('active');
}

export function handleSongSearch(e) {
    const query = e.target.value;
    const bookId = elements.songbookSelect.value;
    renderSongList(query, bookId);
}

export function handleSongbookChange() {
    const query = elements.songSearch.value;
    const bookId = elements.songbookSelect.value;
    renderSongList(query, bookId);
}

export function populateSongbookSelector() {
    const books = getSongbooks();
    books.forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = book.title;
        elements.songbookSelect.appendChild(option);
    });
}

export function renderSongList(query = '', bookId = 'all') {
    const songs = searchSongs(query, bookId);

    elements.songsCount.textContent = `${songs.length} песен`;
    elements.songsList.innerHTML = '';

    if (songs.length === 0) {
        elements.songsList.innerHTML = '<div style="padding: 20px; color: var(--text-tertiary); text-align: center;">Нет песен</div>';
        return;
    }

    songs.sort((a, b) => {
        const numA = parseInt(a.number);
        const numB = parseInt(b.number);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.title.localeCompare(b.title);
    });

    // Use document fragment for performance
    const fragment = document.createDocumentFragment();

    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-item';
        if (state.currentSong && state.currentSong.id === song.id) div.classList.add('active');

        const headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'song-number';
        numberSpan.textContent = song.number ? '№' + song.number : '';
        headerRow.appendChild(numberSpan);

        if (song.bookId === 'user') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.style.cssText = 'width:28px; height:28px; font-size:14px; border:none; opacity:0.4;';
            deleteBtn.textContent = '🗑';
            deleteBtn.title = 'Удалить';
            deleteBtn.onclick = (e) => { e.stopPropagation(); confirmDeleteSong(song); };
            headerRow.appendChild(deleteBtn);
        }

        const titleDiv = document.createElement('div');
        titleDiv.className = 'song-title';
        titleDiv.textContent = song.title;

        const previewDiv = document.createElement('div');
        previewDiv.className = 'song-preview';
        previewDiv.textContent = (song.text.split('\n')[0] || '') + '...';

        div.appendChild(headerRow);
        div.appendChild(titleDiv);
        div.appendChild(previewDiv);

        div.onclick = () => selectSong(song);
        fragment.appendChild(div);
    });

    elements.songsList.appendChild(fragment);
}

function selectSong(song) {
    state.currentSong = song;

    // Parse stanzas
    state.currentStanzas = parseSongStanzas(song);
    state.currentStanzaIndex = 0;

    renderSongList(elements.songSearch.value, elements.songbookSelect.value);

    // Render song text
    renderSongPreview(song);
    elements.songPreviewText.classList.remove('placeholder');
    elements.btnBroadcastSong.disabled = false;

    // Scroll active song into view
    const activeItem = elements.songsList.querySelector('.song-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function parseSongStanzas(song) {
    const rawStanzas = song.text.split('\n\n');
    let verseNum = 0;
    const chorusTracker = new Set();
    const result = [];

    rawStanzas.forEach(stanza => {
        const trimmed = stanza.trim();
        if (!trimmed) return;

        const isChorus = chorusTracker.has(trimmed);
        if (!isChorus) {
            chorusTracker.add(trimmed);
        }

        if (!isChorus) verseNum++;

        result.push({
            text: trimmed,
            label: isChorus ? 'Припев' : `Куплет ${verseNum}`,
            isChorus
        });
    });

    return result;
}

function renderSongPreview(song) {
    const container = elements.songPreviewText;
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.currentStanzas.forEach((stanza, idx) => {
        const block = document.createElement('div');
        block.className = 'song-stanza ' + (stanza.isChorus ? 'chorus' : 'verse');
        if (idx === state.currentStanzaIndex) block.classList.add('active');

        block.style.cursor = 'pointer';
        block.addEventListener('click', () => {
            state.currentStanzaIndex = idx;
            highlightActiveStanza();
            broadcastCurrentStanza();
        });

        const label = document.createElement('div');
        label.className = 'stanza-label';
        label.textContent = stanza.label;
        block.appendChild(label);

        const textDiv = document.createElement('div');
        textDiv.className = 'stanza-text';
        textDiv.innerHTML = escapeHtmlForPreview(stanza.text).replace(/\n/g, '<br>');
        block.appendChild(textDiv);

        fragment.appendChild(block);
    });

    container.appendChild(fragment);
}

function highlightActiveStanza() {
    const blocks = elements.songPreviewText.querySelectorAll('.song-stanza');
    blocks.forEach((block, idx) => {
        block.classList.toggle('active', idx === state.currentStanzaIndex);
    });
    const activeBlock = blocks[state.currentStanzaIndex];
    if (activeBlock) {
        activeBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function broadcastCurrentStanza() {
    if (!state.currentSong || !state.currentStanzas.length) return;
    const stanza = state.currentStanzas[state.currentStanzaIndex];
    if (!stanza) return;

    const success = showSong({
        title: state.currentSong.title,
        number: state.currentSong.number,
        text: stanza.text,
        stanzaLabel: stanza.label,
        stanzaIndex: state.currentStanzaIndex + 1,
        stanzaTotal: state.currentStanzas.length
    });

    const label = stanza.label;
    if (success || isDisplayAvailable()) {
        updateStatus(elements.status, `🎵 ${state.currentSong.number ? '#' + state.currentSong.number + ' ' : ''}${state.currentSong.title} — ${label}`, 'broadcasting');
    } else {
        updateStatus(elements.status, `📡 ${label} >> Эфир`, 'broadcasting');
    }
}

function escapeHtmlForPreview(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function goToNextStanza() {
    if (!state.currentSong || !state.currentStanzas.length) return;
    if (state.currentStanzaIndex < state.currentStanzas.length - 1) {
        state.currentStanzaIndex++;
        highlightActiveStanza();
        broadcastCurrentStanza();
    } else {
        // Next song
        const songs = getCurrentSongList();
        const idx = songs.findIndex(s => s.id === state.currentSong.id);
        if (idx < songs.length - 1) {
            selectSong(songs[idx + 1]);
            broadcastCurrentStanza();
        }
    }
}

export function goToPrevStanza() {
    if (!state.currentSong || !state.currentStanzas.length) return;
    if (state.currentStanzaIndex > 0) {
        state.currentStanzaIndex--;
        highlightActiveStanza();
        broadcastCurrentStanza();
    } else {
        // Prev song last stanza
        const songs = getCurrentSongList();
        const idx = songs.findIndex(s => s.id === state.currentSong.id);
        if (idx > 0) {
            selectSong(songs[idx - 1]);
            state.currentStanzaIndex = state.currentStanzas.length - 1;
            highlightActiveStanza();
            broadcastCurrentStanza();
        }
    }
}

function getCurrentSongList() {
    const query = elements.songSearch.value;
    const bookId = elements.songbookSelect.value;
    const songs = searchSongs(query, bookId);
    songs.sort((a, b) => {
        const numA = parseInt(a.number);
        const numB = parseInt(b.number);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.title.localeCompare(b.title);
    });
    return songs;
}

export function broadcastSong() {
    if (!state.currentSong) return;
    broadcastCurrentStanza();
}

export function confirmDeleteSong(song) {
    if (!confirm(`Удалить песню "${song.title}"?`)) return;

    deleteSong(song.id);

    if (state.currentSong && state.currentSong.id === song.id) {
        state.currentSong = null;
        elements.songPreviewText.textContent = 'Выберите песню из списка';
        elements.songPreviewText.classList.add('placeholder');
        elements.btnBroadcastSong.disabled = true;
    }

    renderSongList(elements.songSearch.value, elements.songbookSelect.value);
}
