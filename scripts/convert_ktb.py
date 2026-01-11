import sqlite3
import json

import os
import zipfile

db_path = "ktb_temp/KTB'22.SQLite3" 
zip_path = "sources/kaz_bible.zip"
output_file = 'app/js/data/ktb_data.js'

if not os.path.exists(db_path):
    print(f"Extracting {zip_path}...")
    os.makedirs("ktb_temp", exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as z:
        # Search for the sqlite file in zip (in case name varies or it's in subdir)
        target_file = next((n for n in z.namelist() if n.endswith('.SQLite3')), None)
        if target_file:
            z.extract(target_file, "ktb_temp")
            # If extracted file name is different (e.g. if it had a path in zip), we might need to move it or update db_path.
            # But usually it extracts to the name. Let's just normalize to be safe or rely on it matching.
            # Simplify: just extract all to ktb_temp and find it.
        else:
            print("Error: No SQLite3 file found in zip.")
            exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Get Books
# We assume standard canonical order matches the book_number ASC order.
# Canonical MyBible usually: 10=Gen, 20=Exo, ... 470=Matt? 
# Let's just fetch all present books and map them sequentially.
print("Reading books...")
cursor.execute("SELECT book_number, short_name, long_name FROM books ORDER BY book_number")
books_rows = cursor.fetchall()

# explicit mapping from MyBible book_number to App BookId (Synodal order 1..66)
# MyBible IDs:
# OT: 10..460 -> 1..39?
# NT: 470=Matt(40), 480=Mark(41), 490=Luke(42), 500=John(43), 510=Acts(44)
# 520=Rom(52), 530=1Cor(53)...
# 660=James(45), 670=1Pet(46), 680=2Pet(47), 690=1John(48), 700=2John(49), 710=3John(50), 720=Jude(51)
# 650=Heb(65), 730=Rev(66)

MYBIBLE_TO_SYNODAL = {
    # Old Testament (Standard 1..39)
    10: 1, 20: 2, 30: 3, 40: 4, 50: 5,
    60: 6, 70: 7, 80: 8, 90: 9, 100: 10,
    110: 11, 120: 12, 130: 13, 140: 14,
    150: 15, 160: 16, 190: 17, # Esth
    220: 18, # Job
    230: 19, # Psalms
    240: 20, # Prov
    250: 21, # Eccl
    260: 22, # Song
    290: 23, # Isa
    300: 24, # Jer
    310: 25, # Lam
    330: 26, # Ezek
    340: 27, # Dan
    350: 28, # Hos
    360: 29, # Joel
    370: 30, # Amos
    380: 31, # Obad
    390: 32, # Jonah
    400: 33, # Mic
    410: 34, # Nahum
    420: 35, # Hab
    430: 36, # Zeph
    440: 37, # Hag
    450: 38, # Zech
    460: 39, # Mal

    # New Testament (Synodal Order differs from Western)
    470: 40, # Matt
    480: 41, # Mark
    490: 42, # Luke
    500: 43, # John
    510: 44, # Acts
    
    # Catholic Epistles (Synodal: James..Jude -> 45..51)
    660: 45, # James
    670: 46, # 1Pet
    680: 47, # 2Pet
    690: 48, # 1John
    700: 49, # 2John
    710: 50, # 3John
    720: 51, # Jude
    
    # Pauline Epistles (Synodal: Rom..Heb -> 52..65)
    520: 52, # Rom
    530: 53, # 1Cor
    540: 54, # 2Cor
    550: 55, # Gal
    560: 56, # Eph
    570: 57, # Phil
    580: 58, # Col
    590: 59, # 1Thess
    600: 60, # 2Thess
    610: 61, # 1Tim
    620: 62, # 2Tim
    630: 63, # Titus
    640: 64, # Philem
    650: 65, # Heb
    
    # Revelation
    730: 66
}

app_books = []
search_map = {} # name -> id for search

for row in books_rows:
    mb_num, short, long = row
    
    if mb_num not in MYBIBLE_TO_SYNODAL:
        print(f"Skipping unknown book number: {mb_num} ({short})")
        continue

    app_id = MYBIBLE_TO_SYNODAL[mb_num]
    
    # We don't store book metadata in the flat structure used by app (only ID),
    # but the app structure for RST/NRT was:
    # { "BookId": 1, "Chapters": [...] }
    # So we prefer to just prepare the structure.
    
    app_books.append({
        "BookId": app_id,
        "BookName": long, # Added Kazakh name
        "Chapters": {} # ChapterId -> { "ChapterId": ..., "Verses": [] }
    })
    
    # Add to search map (lowercase)
    if short:
        search_map[short.lower()] = app_id
    if long:
        search_map[long.lower()] = app_id

print(f"Found {len(app_books)} books.")

# 2. Get Verses
print("Reading verses...")
cursor.execute("SELECT book_number, chapter, verse, text FROM verses ORDER BY book_number, chapter, verse")
verses_rows = cursor.fetchall()

for row in verses_rows:
    mb_num, chapter, verse, text = row
    
    if mb_num not in MYBIBLE_TO_SYNODAL:
        continue # Skip unknown books (e.g. introductions or extra)
        
    book_id = MYBIBLE_TO_SYNODAL[mb_num]
    
    # Find book object in list (id is 1-based index)
    book_obj = next((b for b in app_books if b["BookId"] == book_id), None)
    if not book_obj:
        continue 
    
    # Ensure chapter exists
    if chapter not in book_obj["Chapters"]:
        book_obj["Chapters"][chapter] = {
            "ChapterId": chapter,
            "Verses": []
        }
    
    # Add verse
    # Clean text: MyBible sometimes has HTML tags like <nb>, <pb>, <f>...
    # Basic cleaning might be needed.
    cleaned_text = text.replace('<pb/>', '').replace('<br/>', ' ').strip()
    # Remove footnotes markers roughly if present (simple check)
    
    book_obj["Chapters"][chapter]["Verses"].append({
        "VerseId": verse,
        "Text": cleaned_text
    })

# 3. Finalize Structure
# Convert Chapters dict to list
final_books = []
for b in app_books:
    chapters_list = []
    # Sort chapters
    for cid in sorted(b["Chapters"].keys()):
        c_obj = b["Chapters"][cid]
        chapters_list.append(c_obj)
    
    if chapters_list:
        b["Chapters"] = chapters_list
        final_books.append(b)

final_data = {
    "Translation": "KTB",
    "Books": final_books
}

print(f"Writing to {output_file}...")
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("const KTB_DATA = ")
    json.dump(final_data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(";")
    
    # Write the search map variable
    f.write("\nconst KTB_BOOK_MAP = ")
    json.dump(search_map, f, ensure_ascii=False, separators=(',', ':'))
    f.write(";")

conn.close()
print("Done!")
