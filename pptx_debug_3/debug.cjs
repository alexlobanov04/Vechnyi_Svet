const fs = require('fs');
const xml = fs.readFileSync('ppt/slides/slide13.xml', 'utf-8');

const spRegex = /<p:(sp|cxnSp)\b[^>]*>([\s\S]*?)<\/p:\1>/g;
let spCount = 0;
while (spRegex.exec(xml) !== null) spCount++;

const picRegex = /<p:pic\b[^>]*>([\s\S]*?)<\/p:pic>/g;
let picMatch;
let picCount = 0;
while ((picMatch = picRegex.exec(xml)) !== null) {
    picCount++;
    const embedMatch = picMatch[0].match(/r:embed="([^"]+)"/);
    console.log('pic rId:', embedMatch ? embedMatch[1] : 'MISSING');
}

console.log('Sp:', spCount, '| Pic:', picCount);

const relsXml = fs.readFileSync('ppt/slides/_rels/slide13.xml.rels', 'utf-8');
const relRegex = /Id="([^"]+)"[^>]*Target="([^"]+)"/g;
let m;
while ((m = relRegex.exec(relsXml)) !== null) {
    let target = m[2];
    if (target.startsWith('../')) target = 'ppt/' + target.substring(3);
    else if (!target.startsWith('ppt/') && !target.startsWith('/')) target = 'ppt/slides/' + target;
    console.log(m[1], '->', target);
}
