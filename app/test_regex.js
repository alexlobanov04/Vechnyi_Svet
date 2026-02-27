function parse(query) {
    query = query.toLowerCase()
        .replace(/[:.,]/g, ' ')
        .replace(/\b(глава|гл|главы|стих|ст|стихи)\b/g, ' ')
        .replace(/парапалеменнон|параполеменон/g, 'паралипоменон')
        .replace(/\s+/g, ' ')
        .trim();
        
    const match = query.match(/^(.+?)\s+(\d+)(?:\s+([\d\-\,]+))?$/);
    if (!match) return null;
    
    let bookName = match[1].replace(/\s/g, '');
    let chapter = match[2];
    let verse = match[3] || "1";
    
    return { bookName, chapter, verse };
}

console.log(parse("быт 1 2"));
console.log(parse("1 кор 13:4-5"));
console.log(parse("2 парапалеменнон 2 глава 2 стих"));
console.log(parse("песнь песней 4"));
console.log(parse("1 царств 2 3,4"));
console.log(parse("Шығу 20 3"));
