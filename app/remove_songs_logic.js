const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

const importStatement = `import {
    openAddSongModal,
    closeSongModal,
    insertSongTag,
    saveSongForm,
    editCurrentSong,
    handleSongSearch,
    handleSongbookChange,
    populateSongbookSelector,
    renderSongList,
    goToNextStanza,
    goToPrevStanza,
    broadcastSong,
    confirmDeleteSong
} from './modules/songs-ui.js';`;

// Insert import 
code = code.replace("import { state, elements } from './modules/state.js';", importStatement + "\n\nimport { state, elements } from './modules/state.js';");

// Remove song functions
const startToken = "function openAddSongModal() {";
const endToken = "// === REGISTER SERVICE WORKER ===";
const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
    code = code.slice(0, startIndex) + code.slice(endIndex);
    console.log('Successfully spliced functions.');
} else {
    console.log('Failed to find tokens.', startIndex, endIndex);
}

fs.writeFileSync('js/app.js', code);
