/**
 * canonical.js - Universal Bible Book Code System
 * 
 * Uses OSIS standard book codes as universal identifiers.
 * Each translation has its own BookId mapping.
 * 
 * This enables:
 * - Consistent search across all translations
 * - Multi-translation display
 * - Easy addition of new translations
 */

// ============================================================
// CANONICAL BOOK CODES (OSIS Standard)
// ============================================================

export const BOOK_INFO = {
    // OLD TESTAMENT (1-39)
    GEN: { order: 1, ru: "Бытие", kz: "Жаратылыс", ky: "Башталыш", abbr: ["быт", "бытие", "жаратылыс", "башталыш"] },
    EXO: { order: 2, ru: "Исход", kz: "Шығу", ky: "Чыгуу", abbr: ["исх", "исход", "шығу", "чыгуу"] },
    LEV: { order: 3, ru: "Левит", kz: "Леуіліктер", ky: "Левиттер", abbr: ["лев", "левит", "леуіліктер", "левиттер"] },
    NUM: { order: 4, ru: "Числа", kz: "Сандар", ky: "Сандар", abbr: ["чис", "числа", "сандар"] },
    DEU: { order: 5, ru: "Второзаконие", kz: "Заңды қайталау", ky: "Мыйзамдын кайталанышы", abbr: ["вт", "втор", "второзаконие", "заңдықайталау", "мыйзамдынкайталанышы"] },
    JOS: { order: 6, ru: "Иисус Навин", kz: "Ешуа", ky: "Жошуа", abbr: ["иис", "нав", "иисуснавин", "ешуа", "жошуа"] },
    JDG: { order: 7, ru: "Судьи", kz: "Билер", ky: "Соттор", abbr: ["суд", "судьи", "билер", "соттор"] },
    RUT: { order: 8, ru: "Руфь", kz: "Рут", ky: "Рут", abbr: ["руф", "руфь", "рут"] },
    "1SA": { order: 9, ru: "1-я Царств", kz: "Патшалықтар 1", ky: "1 Самуел", abbr: ["1цар", "1царств", "патшалықтар1", "1самуел"] },
    "2SA": { order: 10, ru: "2-я Царств", kz: "Патшалықтар 2", ky: "2 Самуел", abbr: ["2цар", "2царств", "патшалықтар2", "2самуел"] },
    "1KI": { order: 11, ru: "3-я Царств", kz: "Патшалықтар 3", ky: "1 Падышалар", abbr: ["3цар", "3царств", "патшалықтар3", "1падышалар"] },
    "2KI": { order: 12, ru: "4-я Царств", kz: "Патшалықтар 4", ky: "2 Падышалар", abbr: ["4цар", "4царств", "патшалықтар4", "2падышалар"] },
    "1CH": { order: 13, ru: "1-я Паралипоменон", kz: "Шежірелер 1", ky: "1 Санжыра", abbr: ["1пар", "1паралипоменон", "шежірелер1", "1санжыра"] },
    "2CH": { order: 14, ru: "2-я Паралипоменон", kz: "Шежірелер 2", ky: "2 Санжыра", abbr: ["2пар", "2паралипоменон", "шежірелер2", "2санжыра"] },
    EZR: { order: 15, ru: "Ездра", kz: "Езра", ky: "Ездра", abbr: ["ездр", "ездра", "езра"] },
    NEH: { order: 16, ru: "Неемия", kz: "Нехемия", ky: "Неемия", abbr: ["неем", "неемия", "нехемия"] },
    EST: { order: 17, ru: "Есфирь", kz: "Естер", ky: "Эстер", abbr: ["есф", "есфирь", "естер", "эстер"] },
    JOB: { order: 18, ru: "Иов", kz: "Әйүп", ky: "Аюп", abbr: ["иов", "әйүп", "аюп"] },
    PSA: { order: 19, ru: "Псалтирь", kz: "Жырлар", ky: "Забур", abbr: ["пс", "псалтирь", "псалом", "жырлар", "забур"] },
    PRO: { order: 20, ru: "Притчи", kz: "Нақыл сөздер", ky: "Акыл сөздөр", abbr: ["пр", "притч", "притчи", "нақылсөздер", "акылсөздөр"] },
    ECC: { order: 21, ru: "Екклесиаст", kz: "Уағыздаушы", ky: "Насаатчы", abbr: ["еккл", "экклезиаст", "уағыздаушы", "насаатчы"] },
    SNG: { order: 22, ru: "Песнь Песней", kz: "Сүлейменнің әндері", ky: "Сулаймандын ыры", abbr: ["песн", "песнь", "сүлейменніңәндері", "сулаймандыныры"] },
    ISA: { order: 23, ru: "Исаия", kz: "Ишая", ky: "Ишая", abbr: ["ис", "исаия", "ишая"] },
    JER: { order: 24, ru: "Иеремия", kz: "Еремия", ky: "Жеремия", abbr: ["иер", "иеремия", "еремия", "жеремия"] },
    LAM: { order: 25, ru: "Плач Иеремии", kz: "Еремияның жоқтауы", ky: "Жеремиянын муңу", abbr: ["плач", "еремияныңжоқтауы", "жеремияныңмуну"] },
    EZK: { order: 26, ru: "Иезекииль", kz: "Езекиел", ky: "Эзекиел", abbr: ["иез", "иезекииль", "езекиел", "эзекиел"] },
    DAN: { order: 27, ru: "Даниил", kz: "Даниял", ky: "Даниел", abbr: ["дан", "даниил", "даниял", "даниел"] },
    HOS: { order: 28, ru: "Осия", kz: "Ошия", ky: "Ошия", abbr: ["ос", "осия", "ошия"] },
    JOL: { order: 29, ru: "Иоиль", kz: "Жоел", ky: "Жоел", abbr: ["иоиль", "жоел"] },
    AMO: { order: 30, ru: "Амос", kz: "Амос", ky: "Амос", abbr: ["ам", "амос"] },
    OBA: { order: 31, ru: "Авдий", kz: "Абди", ky: "Обадыя", abbr: ["авд", "авдий", "абди", "обадыя"] },
    JON: { order: 32, ru: "Иона", kz: "Жүніс", ky: "Жунус", abbr: ["иона", "жүніс", "жунус"] },
    MIC: { order: 33, ru: "Михей", kz: "Миха", ky: "Мика", abbr: ["мих", "михея", "миха", "мика"] },
    NAM: { order: 34, ru: "Наум", kz: "Нақұм", ky: "Наум", abbr: ["наум", "нақұм"] },
    HAB: { order: 35, ru: "Аввакум", kz: "Аббақұқ", ky: "Хабакук", abbr: ["авв", "аввакум", "аббақұқ", "хабакук"] },
    ZEP: { order: 36, ru: "Софония", kz: "Софония", ky: "Сепания", abbr: ["соф", "софония", "сепания"] },
    HAG: { order: 37, ru: "Аггей", kz: "Хаққай", ky: "Хакай", abbr: ["агг", "аггей", "хаққай", "хакай"] },
    ZEC: { order: 38, ru: "Захария", kz: "Зәкәрия", ky: "Закарыя", abbr: ["зах", "захария", "зәкәрия", "закарыя"] },
    MAL: { order: 39, ru: "Малахия", kz: "Малахи", ky: "Малаки", abbr: ["мал", "малахия", "малахи", "малаки"] },

    // NEW TESTAMENT (40-66)
    MAT: { order: 40, ru: "От Матфея", kz: "Матай", ky: "Матай", abbr: ["мф", "мт", "матфея", "матфей", "матай"] },
    MRK: { order: 41, ru: "От Марка", kz: "Марқа", ky: "Марк", abbr: ["мк", "марка", "марк", "марқа"] },
    LUK: { order: 42, ru: "От Луки", kz: "Лұқа", ky: "Лука", abbr: ["лк", "луки", "лука", "лұқа"] },
    JHN: { order: 43, ru: "От Иоанна", kz: "Жохан", ky: "Жакан", abbr: ["ин", "иоанна", "иоанн", "жохан", "жакан"] },
    ACT: { order: 44, ru: "Деяния", kz: "Елшілер", ky: "Элчилердин иштери", abbr: ["деян", "деяния", "елшілер", "элчилердиништери"] },
    ROM: { order: 45, ru: "Римлянам", kz: "Римдіктерге", ky: "Римге", abbr: ["рим", "римлянам", "римдіктерге", "римге"] },
    "1CO": { order: 46, ru: "1-е Коринфянам", kz: "Қорынттықтарға 1", ky: "1 Коринфке", abbr: ["1кор", "1коринфянам", "қорынттықтарға1", "1коринфке"] },
    "2CO": { order: 47, ru: "2-е Коринфянам", kz: "Қорынттықтарға 2", ky: "2 Коринфке", abbr: ["2кор", "2коринфянам", "қорынттықтарға2", "2коринфке"] },
    GAL: { order: 48, ru: "Галатам", kz: "Ғалаттықтарға", ky: "Галатага", abbr: ["гал", "галатам", "ғалаттықтарға", "галатага"] },
    EPH: { order: 49, ru: "Ефесянам", kz: "Ефестіктерге", ky: "Эфеске", abbr: ["еф", "ефесянам", "ефестіктерге", "эфеске"] },
    PHP: { order: 50, ru: "Филиппийцам", kz: "Філіпіліктерге", ky: "Филипиге", abbr: ["флп", "филиппийцам", "філіпіліктерге", "филипиге"] },
    COL: { order: 51, ru: "Колоссянам", kz: "Қолостықтарға", ky: "Колоссага", abbr: ["кол", "колоссянам", "қолостықтарға", "колоссага"] },
    "1TH": { order: 52, ru: "1-е Фессалоникийцам", kz: "Салониқалықтарға 1", ky: "1 Салоникага", abbr: ["1фес", "1фессалоникийцам", "салониқалықтарға1", "1салоникага"] },
    "2TH": { order: 53, ru: "2-е Фессалоникийцам", kz: "Салониқалықтарға 2", ky: "2 Салоникага", abbr: ["2фес", "2фессалоникийцам", "салониқалықтарға2", "2салоникага"] },
    "1TI": { order: 54, ru: "1-е Тимофею", kz: "Тімотеге 1", ky: "1 Тимотейге", abbr: ["1тим", "1тимофею", "тімотеге1", "1тимотейге"] },
    "2TI": { order: 55, ru: "2-е Тимофею", kz: "Тімотеге 2", ky: "2 Тимотейге", abbr: ["2тим", "2тимофею", "тімотеге2", "2тимотейге"] },
    TIT: { order: 56, ru: "Титу", kz: "Титке", ky: "Титке", abbr: ["тит", "титу", "титке"] },
    PHM: { order: 57, ru: "Филимону", kz: "Філімонға", ky: "Филимонго", abbr: ["флм", "филимону", "філімонға", "филимонго"] },
    HEB: { order: 58, ru: "Евреям", kz: "Еврейлерге", ky: "Жөөттөргө", abbr: ["евр", "евреям", "еврейлерге", "жөөттөргө"] },
    JAS: { order: 59, ru: "Иакова", kz: "Жақып", ky: "Жакып", abbr: ["иак", "иакова", "жақып", "жакып"] },
    "1PE": { order: 60, ru: "1-е Петра", kz: "Петірдің 1", ky: "1 Петир", abbr: ["1пет", "1петра", "петірдің1", "1петир"] },
    "2PE": { order: 61, ru: "2-е Петра", kz: "Петірдің 2", ky: "2 Петир", abbr: ["2пет", "2петра", "петірдің2", "2петир"] },
    "1JN": { order: 62, ru: "1-е Иоанна", kz: "Жоханның 1", ky: "1 Жакан", abbr: ["1ин", "1иоанна", "жоханның1", "1жакан"] },
    "2JN": { order: 63, ru: "2-е Иоанна", kz: "Жоханның 2", ky: "2 Жакан", abbr: ["2ин", "2иоанна", "жоханның2", "2жакан"] },
    "3JN": { order: 64, ru: "3-е Иоанна", kz: "Жоханның 3", ky: "3 Жакан", abbr: ["3ин", "3иоанна", "жоханның3", "3жакан"] },
    JUD: { order: 65, ru: "Иуды", kz: "Яһуда", ky: "Жуда", abbr: ["иуд", "иуды", "яһуда", "жуда"] },
    REV: { order: 66, ru: "Откровение", kz: "Аян", ky: "Аян", abbr: ["откр", "откровение", "аян"] }
};

// ============================================================
// TRANSLATION MAPPINGS (Canonical Code → BookId in data file)
// ============================================================

export const TRANSLATION_MAPS = {
    // RST and NRT use standard Protestant ordering
    RST: {
        GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
        "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
        EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
        ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
        OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
        MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44,
        ROM: 45, "1CO": 46, "2CO": 47, GAL: 48, EPH: 49, PHP: 50, COL: 51,
        "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, TIT: 56, PHM: 57, HEB: 58,
        JAS: 59, "1PE": 60, "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66
    },

    // NRT uses same ordering as RST
    NRT: {
        GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
        "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
        EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
        ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
        OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
        MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44,
        ROM: 45, "1CO": 46, "2CO": 47, GAL: 48, EPH: 49, PHP: 50, COL: 51,
        "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, TIT: 56, PHM: 57, HEB: 58,
        JAS: 59, "1PE": 60, "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66
    },

    // KTB uses different ordering for some NT books!
    // General Epistles (JAS-JUD) come BEFORE Paul's Epistles (ROM-HEB) in file
    KTB: {
        GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
        "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
        EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
        ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
        OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
        MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44,
        // NOTE: KTB has different BookIds for NT epistles!
        JAS: 45, "1PE": 46, "2PE": 47, "1JN": 48, "2JN": 49, "3JN": 50, JUD: 51,
        ROM: 52, "1CO": 53, "2CO": 54, GAL: 55, EPH: 56, PHP: 57, COL: 58,
        "1TH": 59, "2TH": 60, "1TI": 61, "2TI": 62, TIT: 63, PHM: 64, HEB: 65,
        REV: 66
    },

    // KYB (Kyrgyz) uses Western Protestant ordering (same as RST/NRT)
    KYB: {
        GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
        "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
        EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
        ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
        OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
        MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44,
        ROM: 45, "1CO": 46, "2CO": 47, GAL: 48, EPH: 49, PHP: 50, COL: 51,
        "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, TIT: 56, PHM: 57, HEB: 58,
        JAS: 59, "1PE": 60, "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66
    }
};

// ============================================================
// LOOKUP UTILITIES
// ============================================================

// Build reverse lookup: abbreviation → canonical code
const _abbrToCode = {};
for (const [code, info] of Object.entries(BOOK_INFO)) {
    // Register explicit abbreviations
    for (const abbr of info.abbr) {
        _abbrToCode[abbr] = code;
    }
    // Automatically register the exact localized titles without spaces/dashes!
    // This perfectly catches titles like "1-е Коринфянам", "Песнь Песней", "Плач Иеремии" when clicked in visual nav.
    const normalizeTitle = (t) => t.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    if (info.ru) _abbrToCode[normalizeTitle(info.ru)] = code;
    if (info.kz) _abbrToCode[normalizeTitle(info.kz)] = code;
    if (info.ky) _abbrToCode[normalizeTitle(info.ky)] = code;
}

/**
 * Get canonical code from user input (abbreviation or full name)
 * @param {string} input - User input like "рим", "римлянам", "rom"
 * @returns {string|null} Canonical code like "ROM" or null
 */
export function getCanonicalCode(input) {
    const normalized = input.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    return _abbrToCode[normalized] || null;
}

/**
 * Get BookId for a canonical code in a specific translation
 * @param {string} canonicalCode - Like "ROM"
 * @param {string} translation - Like "RST", "NRT", "KTB"
 * @returns {number|null} BookId in that translation's data file
 */
export function getBookId(canonicalCode, translation) {
    const map = TRANSLATION_MAPS[translation];
    if (!map) return null;
    return map[canonicalCode] || null;
}

/**
 * Get book title in specified language
 * @param {string} canonicalCode - Like "ROM"
 * @param {string} lang - "ru", "kz", or "ky"
 * @returns {string} Book title
 */
export function getBookTitle(canonicalCode, lang = 'ru') {
    const info = BOOK_INFO[canonicalCode];
    if (!info) return "Библия";
    if (lang === 'kz') return info.kz || info.ru;
    if (lang === 'ky') return info.ky || info.ru;
    return info.ru;
}

/**
 * Get all supported translations
 * @returns {string[]} List of translation codes
 */
export function getSupportedTranslations() {
    return Object.keys(TRANSLATION_MAPS);
}

/**
 * Get book title by translation and bookId
 * @param {number} bookId - Like 1, 2, 3
 * @param {string} translation - Like "RST", "NRT"
 * @param {string} lang - "ru", "kz", "ky"
 * @returns {string} Book title
 */
export function getBookTitleById(bookId, translation, lang = 'ru') {
    const map = TRANSLATION_MAPS[translation];
    if (!map) return "Библия";

    const canonicalCode = Object.keys(map).find(key => map[key] === bookId);
    if (!canonicalCode) return "Библия";

    return getBookTitle(canonicalCode, lang);
}
