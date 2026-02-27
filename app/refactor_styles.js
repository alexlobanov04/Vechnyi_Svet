const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'controller.html');
const cssPath = path.join(__dirname, 'css', 'controller.css');

let htmlContent = fs.readFileSync(htmlPath, 'utf8');

let styleMap = new Map();
let counter = 1;

// Regex to find style="..."
const styleRegex = /style="([^"]+)"/g;

htmlContent = htmlContent.replace(styleRegex, (match, styleContent) => {
    const trimmed = styleContent.trim();

    // Skip purely dynamic or simple display toggles
    if (trimmed === 'display: none;' || trimmed === 'display:none;') {
        return match;
    }

    if (!styleMap.has(trimmed)) {
        styleMap.set(trimmed, `u-style-${counter++}`);
    }

    const className = styleMap.get(trimmed);
    return `data-inline-style="${className}"`;
});

// Second pass: merge data-inline-style into class="" or add new class
// This handles elements with class before style
htmlContent = htmlContent.replace(/class="([^"]+)"([\s]*.*?)data-inline-style="([^"]+)"/g, (match, existingClasses, between, newClass) => {
    return `class="${existingClasses} ${newClass}"${between}`;
});

// This handles elements with style before class
htmlContent = htmlContent.replace(/data-inline-style="([^"]+)"([\s]*.*?)class="([^"]+)"/g, (match, newClass, between, existingClasses) => {
    return `${between}class="${existingClasses} ${newClass}"`;
});

// For elements that had no class attribute at all
htmlContent = htmlContent.replace(/data-inline-style="([^"]+)"/g, 'class="$1"');

fs.writeFileSync(htmlPath, htmlContent, 'utf8');

// Append to CSS
let cssAppend = '\n\n/* === EXTRACTED UTILITY CLASSES === */\n';
for (const [styleContent, className] of styleMap.entries()) {
    // Add missing semicolon at the end if needed for cleaner CSS
    let cleanStyle = styleContent;
    if (!cleanStyle.endsWith(';')) cleanStyle += ';';
    cssAppend += `.${className} { ${cleanStyle} }\n`;
}

fs.appendFileSync(cssPath, cssAppend, 'utf8');
console.log(`Extracted ${styleMap.size} unique inline styles.`);
