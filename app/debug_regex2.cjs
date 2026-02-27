const fs = require('fs');
const xml = fs.readFileSync('../pptx_debug_3/ppt/slides/slide13.xml', 'utf-8');
console.log('Length:', xml.length);
const shapeRegex = /<p:(sp|cxnSp|pic)\b[\s\S]*?<\/p:\1>/g;
let match;
let c = 0;
while ((match = shapeRegex.exec(xml)) !== null) {
  c++;
  console.log('Match:', match[1]);
}
console.log('Total:', c);
