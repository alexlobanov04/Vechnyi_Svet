/**
 * state.js - Central application state
 * Holds global state properties and DOM element references
 */

export const state = {
    currentVerse: null,
    currentSong: null,
    currentStanzas: [],   // parsed stanzas [{text, label, isChorus}]
    currentStanzaIndex: 0,
    currentMode: 'bible', // 'bible', 'songs', 'slides', 'backgrounds'
    currentPresentation: null,  // Full presentation object
    currentSlideIndex: 0,
    pendingSlides: []  // Temp storage for modal upload
};

// Application's core DOM elements
export const elements = {
    input: document.getElementById('search-input'),
    status: document.getElementById('status'),
    verseText: document.getElementById('verse-text'),
    verseRef: document.getElementById('verse-ref'),
    btnBroadcast: document.getElementById('btn-broadcast'),
    historyList: document.getElementById('history'),
    editArea: document.getElementById('edit-area'),
    noteInput: document.getElementById('note-input'),
    noteLiveToggle: document.getElementById('note-live-toggle'),
    translationSelect: document.getElementById('translation-select'),
    fontSelect: document.getElementById('font-select'),
    themeSelect: document.getElementById('theme-select'),
    themeHex: document.getElementById('theme-hex'),
    textColorSelect: document.getElementById('text-color-select'),
    textColorHex: document.getElementById('text-color-hex'),
    sizeRange: document.getElementById('size-range'),
    settingsModal: document.getElementById('settings-modal'),
    loading: document.getElementById('loading'),

    // Song Mode Elements
    modeBible: document.getElementById('mode-bible'),
    modeSongs: document.getElementById('mode-songs'),
    btnModeBible: document.getElementById('btn-mode-bible'),
    btnModeSongs: document.getElementById('btn-mode-songs'),
    songSearch: document.getElementById('song-search-input'),
    songbookSelect: document.getElementById('songbook-select'),
    songsList: document.getElementById('songs-list'),
    songsCount: document.getElementById('songs-count'),
    songPreviewText: document.getElementById('song-preview-text'),
    btnBroadcastSong: document.getElementById('btn-broadcast-song'),
    songModal: document.getElementById('song-modal'),
    songFormId: document.getElementById('song-id'),
    songFormNumber: document.getElementById('song-number'),
    songFormTitle: document.getElementById('song-title'),
    songFormText: document.getElementById('song-text'),

    // Slides Mode Elements
    modeSlides: document.getElementById('mode-slides'),
    btnModeSlides: document.getElementById('btn-mode-slides'),
    presentationsList: document.getElementById('presentations-list'),
    slidesCount: document.getElementById('slides-count'),
    slidePreviewArea: document.getElementById('slide-preview-area'),
    slidePreviewImg: document.getElementById('slide-preview-img'),
    slidePreviewPlaceholder: document.getElementById('slide-preview-placeholder'),
    slideThumbnails: document.getElementById('slide-thumbnails'),
    slideCounter: document.getElementById('slide-counter'),
    btnBroadcastSlide: document.getElementById('btn-broadcast-slide'),
    presentationModal: document.getElementById('presentation-modal'),
    presTitle: document.getElementById('pres-title'),
    slideDropZone: document.getElementById('slide-drop-zone'),
    slideFileInput: document.getElementById('slide-file-input'),
    uploadPreviewGrid: document.getElementById('upload-preview-grid'),
    uploadStatus: document.getElementById('upload-status'),

    // Backgrounds Mode Elements
    modeBackgrounds: document.getElementById('mode-backgrounds'),
    btnModeBackgrounds: document.getElementById('btn-mode-backgrounds'),
    bgDropZone: document.getElementById('bg-drop-zone'),
    bgFileInput: document.getElementById('bg-file-input'),
    bgGallery: document.getElementById('bg-gallery'),
    bgCount: document.getElementById('bg-count')
};
