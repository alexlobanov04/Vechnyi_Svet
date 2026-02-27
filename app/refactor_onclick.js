const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'controller.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Regex to find onclick="functionName('arg1', 'arg2')"
const onclickRegex = /onclick="([a-zA-Z0-9_]+)\((.*?)\)"/g;

content = content.replace(onclickRegex, (match, funcName, argsString) => {
    // If there are arguments, clean them up (remove quotes)
    let args = argsString.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);

    let replacement = `data-action="${funcName}"`;
    if (args.length > 0) {
        replacement += ` data-args="${args.join(',')}"`;
    }
    return replacement;
});

// A special case at line 576: onclick="if(window.finalizeInit) window.finalizeInit(); else { document.getElementById('loading').style.display='none'; }"
content = content.replace(/onclick="if\(window\.finalizeInit.*\n*[^"]*"/, 'data-action="skipLoading"');

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('Processed onclick attributes.');
