#!/usr/bin/env python3
"""
convert_kyb.py - Convert KYB (Kyrgyz Bible) from SQLite3 to JS data file

Source: bible module/KYB.SQLite3
Output: app/js/data/kyb_data.js
"""

import sqlite3
import json
import os

# Paths relative to project root
db_path = "bible module/KYB.SQLite3"
output_file = 'app/js/data/kyb_data.js'

# MyBible book_number → App BookId (Standard Protestant ordering)
# KYB uses Western Protestant order (Paul's epistles before General epistles)
MYBIBLE_TO_BOOKID = {
    # Old Testament (Standard 1..39)
    10: 1,   # Genesis / Башталыш
    20: 2,   # Exodus / Чыгуу
    30: 3,   # Leviticus / Лебилер
    40: 4,   # Numbers / Сандар
    50: 5,   # Deuteronomy / Мыйзамды кайталоо
    60: 6,   # Joshua / Жашыя
    70: 7,   # Judges / Башкаруучулар
    80: 8,   # Ruth / Рут
    90: 9,   # 1 Samuel / 1 Шемуел
    100: 10, # 2 Samuel / 2 Шемуел
    110: 11, # 1 Kings / 1 Падышалар
    120: 12, # 2 Kings / 2 Падышалар
    130: 13, # 1 Chronicles / 1 Жылнаама
    140: 14, # 2 Chronicles / 2 Жылнаама
    150: 15, # Ezra / Эзра
    160: 16, # Nehemiah / Некемия
    190: 17, # Esther / Эстер
    220: 18, # Job / Аюб
    230: 19, # Psalms / Забур
    240: 20, # Proverbs / Накыл
    250: 21, # Ecclesiastes / Насаатчы
    260: 22, # Song of Solomon / Ырдын ыры
    290: 23, # Isaiah / Ышайа
    300: 24, # Jeremiah / Жеремия
    310: 25, # Lamentations / Жеремиянын ыйы
    330: 26, # Ezekiel / Жезекиел
    340: 27, # Daniel / Даниел
    350: 28, # Hosea / Ошуя
    360: 29, # Joel / Жоел
    370: 30, # Amos / Амос
    380: 31, # Obadiah / Обадия
    390: 32, # Jonah / Жунус
    400: 33, # Micah / Михей
    410: 34, # Nahum / Накум
    420: 35, # Habakkuk / Хабакук
    430: 36, # Zephaniah / Сепания
    440: 37, # Haggai / Акай
    450: 38, # Zechariah / Захария
    460: 39, # Malachi / Малахия

    # New Testament - Western Protestant Order (Paul before General)
    470: 40, # Matthew / Матай
    480: 41, # Mark / Марк
    490: 42, # Luke / Лука
    500: 43, # John / Жакан
    510: 44, # Acts / Элчилердин иштери
    
    # Paul's Epistles (45-58)
    520: 45, # Romans / Римдиктерге
    530: 46, # 1 Corinthians / 1 Корунттуктарга
    540: 47, # 2 Corinthians / 2 Корунттуктарга
    550: 48, # Galatians / Галатиялыктарга
    560: 49, # Ephesians / Эфестиктерге
    570: 50, # Philippians / Филипиликтерге
    580: 51, # Colossians / Колосалыктарга
    590: 52, # 1 Thessalonians / 1 Тесалоникалыктарга
    600: 53, # 2 Thessalonians / 2 Тесалоникалыктарга
    610: 54, # 1 Timothy / 1 Тиметейге
    620: 55, # 2 Timothy / 2 Тиметейге
    630: 56, # Titus / Титке
    640: 57, # Philemon / Филемонго
    650: 58, # Hebrews / Эврейлерге
    
    # General Epistles (59-65)
    660: 59, # James / Жакып
    670: 60, # 1 Peter / 1 Петир
    680: 61, # 2 Peter / 2 Петир
    690: 62, # 1 John / 1 Жакан
    700: 63, # 2 John / 2 Жакан
    710: 64, # 3 John / 3 Жакан
    720: 65, # Jude / Жүйүт
    
    # Revelation
    730: 66  # Revelation / Аян
}

def main():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Get Books
    print("Reading books...")
    cursor.execute("SELECT book_number, short_name, long_name FROM books ORDER BY book_number")
    books_rows = cursor.fetchall()
    
    app_books = []
    search_map = {}  # For search: name -> BookId
    
    for row in books_rows:
        mb_num, short, long_name = row
        
        if mb_num not in MYBIBLE_TO_BOOKID:
            print(f"Skipping unknown book number: {mb_num} ({short})")
            continue
        
        book_id = MYBIBLE_TO_BOOKID[mb_num]
        
        app_books.append({
            "BookId": book_id,
            "BookName": long_name,
            "Chapters": {}  # ChapterId -> { ChapterId, Verses[] }
        })
        
        # Add to search map (lowercase)
        if short:
            search_map[short.lower()] = book_id
        if long_name:
            search_map[long_name.lower()] = book_id
    
    print(f"Found {len(app_books)} books.")
    
    # 2. Get Verses
    print("Reading verses...")
    cursor.execute("SELECT book_number, chapter, verse, text FROM verses ORDER BY book_number, chapter, verse")
    verses_rows = cursor.fetchall()
    
    for row in verses_rows:
        mb_num, chapter, verse, text = row
        
        if mb_num not in MYBIBLE_TO_BOOKID:
            continue
            
        book_id = MYBIBLE_TO_BOOKID[mb_num]
        
        book_obj = next((b for b in app_books if b["BookId"] == book_id), None)
        if not book_obj:
            continue
        
        # Ensure chapter exists
        if chapter not in book_obj["Chapters"]:
            book_obj["Chapters"][chapter] = {
                "ChapterId": chapter,
                "Verses": []
            }
        
        # Clean text from MyBible HTML tags
        cleaned_text = text.replace('<pb/>', '').replace('<br/>', ' ').strip()
        
        book_obj["Chapters"][chapter]["Verses"].append({
            "VerseId": verse,
            "Text": cleaned_text
        })
    
    # 3. Finalize Structure
    final_books = []
    for b in app_books:
        chapters_list = []
        for cid in sorted(b["Chapters"].keys()):
            chapters_list.append(b["Chapters"][cid])
        
        if chapters_list:
            b["Chapters"] = chapters_list
            final_books.append(b)
    
    # Sort by BookId
    final_books.sort(key=lambda x: x["BookId"])
    
    final_data = {
        "Translation": "KYB",
        "Books": final_books
    }
    
    # Count verses for verification
    total_verses = sum(
        len(ch["Verses"]) 
        for book in final_books 
        for ch in book["Chapters"]
    )
    print(f"Total verses: {total_verses}")
    
    # 4. Write output
    print(f"Writing to {output_file}...")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("window.KYB_DATA = ")
        json.dump(final_data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(";\n")
        
        # Write search map for Kyrgyz book names
        f.write("\nconst KYB_BOOK_MAP = ")
        json.dump(search_map, f, ensure_ascii=False, separators=(',', ':'))
        f.write(";\n")
    
    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
