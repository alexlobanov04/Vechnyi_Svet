import { getCanonicalCode } from './js/modules/canonical.js';
import { parseQuery } from './js/modules/search.js';

const queries = [
    "1-я Паралипоменон 2 3",
    "1 парапалемилион 2 3",
    "1-я царств 2 3",
    "Еккелисиаст 2 3",
    "Песни песней 2 3",
    "Плач иеремия 2 3",
    "Михей 2 3",
    "от Матфея 2 3",
    "1-е Коринфянам 2 3",
    "1 Фесолоникийцам 2 3",
    "1-е Тимофею 2 3",
    "1-е Петра 2 3",
    "1-е Иоанна 2 3"
];

queries.forEach(q => {
    const parsed = parseQuery(q);
    console.log(`"${q}" ->`, parsed ? parsed.bookName + " " + parsed.chapter + ":" + parsed.verse : "FAILED");
});
