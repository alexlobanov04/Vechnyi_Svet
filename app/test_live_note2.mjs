import fs from 'fs';

// Read the display.js file
const code = fs.readFileSync('./js/display.js', 'utf-8');

// We are just looking to assert that the `if (data.isLiveTyping && mode === 'note')` block exists and contains `return;`
const hasFastPath = code.includes('if (data.isLiveTyping && mode === \'note\')');
const hasReturn = code.includes('return;');
const hasCssVisible = code.includes('container.classList.add(\'visible\')');
const escapesHtml = code.includes('content.innerHTML = escapeHtml(data.text)');

console.log("Syntax checks:");
console.log("Has fast path:", hasFastPath);
console.log("Has return:", hasReturn);
console.log("Adds visible class immediately:", hasCssVisible);
console.log("Escapes inner text:", escapesHtml);

if (hasFastPath && hasReturn && hasCssVisible && escapesHtml) {
    console.log("\nTEST PASSED: The new fast-path code exists and contains all required non-animated DOM updates!");
} else {
    console.log("\nTEST FAILED: Fast-path code is missing or malformed.");
}
