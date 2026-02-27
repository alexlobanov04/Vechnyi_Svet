const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// List of window assignments to remove or convert
const regex1 = /window\.([a-zA-Z0-9_]+)\s*=\s*(?:async\s)?function\s*\(/g;
content = content.replace(regex1, (match, funcName) => {
    // Check if it was async
    const isAsync = match.includes('async function');
    return `${isAsync ? 'async ' : ''}function ${funcName}(`;
});

const regex2 = /window\.([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+);/g;
content = content.replace(regex2, '');

const eventListenerCode = `
// === GLOBAL EVENT DELEGATION ROUTER ===
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    // Ignore clicks that are handled inside other modals if we have complex structures,
    // but typically tracking data-action is sufficient to isolate standard actions.
    const action = btn.dataset.action;
    const argsStr = btn.dataset.args;
    const args = argsStr ? argsStr.split(',') : [];

    // Map actions to functions
    const actionMap = {
        clearHistory,
        toggleSettings,
        openDisplayWindow,
        switchMode,
        openTextSearch,
        openBibleNavModal,
        toggleEditMode,
        saveEdit: () => { window.saveEdit(); }, // Note: saveEdit is imported from settings.js, making it local or handling specifically
        cancelEdit,
        showNote,
        broadcastToDisplay,
        goToPrevVerse,
        goToNextVerse,
        hideFromDisplay,
        openAddSongModal,
        editCurrentSong,
        broadcastSong,
        goToPrevStanza,
        goToNextStanza,
        openCreatePresentationModal,
        deleteCurrentPresentation,
        broadcastSlide,
        goToPrevSlide,
        goToNextSlide,
        closeSlidesModal,
        bibleNavGoBack,
        closeBibleNavModal,
        closeTextSearch,
        insertSongTag,
        closeSongModal,
        saveSongForm,
        closePresentationModal,
        savePresentationForm,
        skipLoading: () => {
            if(window.finalizeInit) window.finalizeInit(); else { document.getElementById('loading').style.display='none'; }
        }
    };

    if (actionMap[action]) {
        // We handle some imported functions directly if they collide or need wrapper
        actionMap[action](...args);
    } else {
        console.warn('Click action not mapped:', action);
    }
});
`;

// Wait, saveEdit is imported from settings.js. We need to make sure imported functions aren't redefined or are properly wrapped.
// We'll wrap ALL in action map or directly refer to them.

content += eventListenerCode;

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Processed window bindings and added router.');
