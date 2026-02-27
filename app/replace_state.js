const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// List of state variables to replace
const vars = [
    'currentVerse',
    'currentSong',
    'currentStanzas',
    'currentStanzaIndex',
    'currentMode',
    'currentPresentation',
    'currentSlideIndex',
    'pendingSlides'
];

vars.forEach(v => {
    // Regex to match variable names preceded by word boundaries or specific characters
    // ignoring if it's already state.varname
    const regex = new RegExp(`(?<!state\\.)\\b${v}\\b`, 'g');
    content = content.replace(regex, `state.${v}`);
});

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Variables replaced with state.*');
