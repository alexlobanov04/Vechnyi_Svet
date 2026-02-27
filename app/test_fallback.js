const fs = require('fs');
eval(fs.readFileSync('js/common.js', 'utf8'));
const getBookTitle = window.getBookTitle;

const titles = [];
for (let i = 1; i <= 25; i++) {
    titles.push(getBookTitle(i));
}
console.log(titles);
