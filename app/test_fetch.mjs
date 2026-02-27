import { fetchVerse, parseQuery } from './js/modules/search.js';
import fs from 'fs';

// Fake DB structure based on data format
const kybDataStr = fs.readFileSync('./js/data/kyb_data.js', 'utf8').replace('window.KYB_DATA = ', '');
const kybData = JSON.parse(kybDataStr.slice(0, kybDataStr.lastIndexOf(';')));
const db = { Books: kybData };

const parsed = parseQuery("Чыгуу 20:3");
console.log('Parsed:', parsed);

const verse = fetchVerse(parsed, db, 'KYB');
console.log('Verse:', verse);
