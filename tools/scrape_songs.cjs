#!/usr/bin/env node
/**
 * Song Scraper for sbornik.sbena.net
 * Downloads all songs from specified albums and converts to songs_data.js
 * 
 * Usage: node tools/scrape_songs.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============== CONFIGURATION ==============
const BASE_URL = 'https://sbornik.sbena.net/api';

const ALBUMS = [
    { id: 'mol_FVZflEV', name: 'Молодежный' },
    { id: 'kyrg_VEpu0WD', name: 'Рухий ырлар жыйнагы' }
];

// Delay between requests to be respectful (ms)
const DELAY_MS = 300;

// Output path
const OUTPUT_PATH = path.join(__dirname, '..', 'app', 'js', 'data', 'songs_data.js');
// ============================================

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Strip HTML tags and chord markers from song text.
 * Converts HTML to clean text preserving line structure.
 */
function cleanSongText(htmlText) {
    if (!htmlText) return '';

    let text = htmlText;

    // Remove chord markers like {D}, {G}, {Am}, {E(Em)}, etc.
    text = text.replace(/\{[^}]*\}/g, '');

    // Remove <span class=word>...</span> — keep inner text
    text = text.replace(/<span[^>]*>/gi, '');
    text = text.replace(/<\/span>/gi, '');

    // Remove <u>...</u> — keep inner text
    text = text.replace(/<\/?u>/gi, '');

    // Convert section headers: <div class=verse>Куплет 1</div> → empty (we don't need labels)
    // Or keep them as markers — let's keep them as section separators
    text = text.replace(/<div class=verse>(.*?)<\/div>/gi, '');
    text = text.replace(/<div class="?repeat"?[^>]*>(.*?)<\/div>/gi, '');
    text = text.replace(/<div class="?repeat dup"?[^>]*>(.*?)<\/div>/gi, '');

    // Convert <div class="part ...">...</div> to just the content + double newline
    text = text.replace(/<div class="?part[^"]*"?>/gi, '');
    text = text.replace(/<\/div>/gi, '');

    // Convert \n to actual newlines (they come escaped)
    text = text.replace(/\\n/g, '\n');

    // Convert <br> / <br/> to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Remove any remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');

    // Clean up extra whitespace
    text = text.replace(/[ \t]+$/gm, '');       // trailing spaces per line
    text = text.replace(/^\s*\n/gm, '\n');       // empty lines → single newline
    text = text.replace(/\n{3,}/g, '\n\n');      // max 2 newlines in a row
    text = text.trim();

    // Remove " - 2р." repeats marker at end of lines
    text = text.replace(/ - \d+р\.?/g, '');

    return text;
}

async function scrapeAlbum(album) {
    console.log(`\n📖 Загружаю альбом: "${album.name}" (${album.id})`);

    // 1. Get album metadata with song list
    const albumData = await fetchJSON(`${BASE_URL}/album/${album.id}`);
    const songList = albumData.Data.List;
    const totalSongs = songList.length;

    console.log(`   Найдено ${totalSongs} песен`);

    const songs = [];
    let errors = 0;

    // 2. Iterate and download each song
    for (let i = 0; i < totalSongs; i++) {
        const songMeta = songList[i];
        const number = songMeta.Number;
        const title = songMeta.Title;

        process.stdout.write(`   [${i + 1}/${totalSongs}] #${number} ${title.substring(0, 40)}...`);

        try {
            const songData = await fetchJSON(`${BASE_URL}/album/${album.id}/${number}`);
            const rawText = songData.Data.Text || '';
            const cleanText = cleanSongText(rawText);

            songs.push({
                number: String(number),
                title: title.trim(),
                text: cleanText
            });

            process.stdout.write(' ✅\n');
        } catch (err) {
            process.stdout.write(` ❌ ${err.message}\n`);
            errors++;

            // Still add with empty text so we don't lose the entry
            songs.push({
                number: String(number),
                title: title.trim(),
                text: `[Ошибка загрузки: ${err.message}]`
            });
        }

        // Delay to be nice to the server
        if (i < totalSongs - 1) {
            await sleep(DELAY_MS);
        }
    }

    console.log(`   ✓ Готово: ${totalSongs - errors} загружено, ${errors} ошибок`);

    return {
        id: album.id,
        title: album.name,
        lang: album.id.startsWith('kyrg') ? 'kg' : 'ru',
        type: 'static',
        songs: songs
    };
}

async function main() {
    console.log('🎵 Song Scraper for sbornik.sbena.net');
    console.log('=====================================');

    const allSongbooks = [];

    for (const album of ALBUMS) {
        try {
            const songbook = await scrapeAlbum(album);
            allSongbooks.push(songbook);
        } catch (err) {
            console.error(`❌ Ошибка при загрузке альбома "${album.name}":`, err.message);
        }
    }

    // 3. Write output file
    console.log(`\n💾 Сохраняю в ${OUTPUT_PATH}...`);

    const jsContent = `/**
 * Song data from sbornik.sbena.net
 * Auto-generated on ${new Date().toISOString().split('T')[0]}
 * 
 * Collections:
${allSongbooks.map(sb => ` *   - ${sb.title}: ${sb.songs.length} songs`).join('\n')}
 */

window.SONGS_DATA = ${JSON.stringify(allSongbooks, null, 2)};
`;

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, jsContent, 'utf8');

    const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
    console.log(`✅ Готово! Файл: ${OUTPUT_PATH} (${fileSizeKB} KB)`);
    console.log(`   Сборников: ${allSongbooks.length}`);
    console.log(`   Всего песен: ${allSongbooks.reduce((sum, sb) => sum + sb.songs.length, 0)}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
