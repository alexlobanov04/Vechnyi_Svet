const fs = require('fs');
const xml = fs.readFileSync('../pptx_debug_4/ppt/slides/slide1.xml', 'utf-8');

const picRegex = /<p:pic\b[^>]*>([\s\S]*?)<\/p:pic>/g;
let picMatch;
let picCount = 0;
while ((picMatch = picRegex.exec(xml)) !== null) {
    picCount++;
    const embedMatch = picMatch[0].match(/r:embed="([^"]+)"/);
    console.log('pic rId:', embedMatch ? embedMatch[1] : 'MISSING');
}

console.log('Pic:', picCount);

const relsXml = fs.readFileSync('../pptx_debug_4/ppt/slides/_rels/slide1.xml.rels', 'utf-8');
const relRegex = /Id="([^"]+)"[^>]*Target="([^"]+)"/g;
let m;
while ((m = relRegex.exec(relsXml)) !== null) {
    console.log(m[1], '->', m[2]);
}
