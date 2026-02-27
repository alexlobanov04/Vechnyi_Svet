const fs = require('fs');
const xml = fs.readFileSync('../pptx_debug_3/ppt/slides/slide13.xml', 'utf-8');
const shapeRegex = /<p:(sp|cxnSp|pic)\b[^>]*>([\s\S]*?)<\/p:\1>/g;
let match;
while ((match = shapeRegex.exec(xml)) !== null) {
  console.log('Match:', match[1]);
}
