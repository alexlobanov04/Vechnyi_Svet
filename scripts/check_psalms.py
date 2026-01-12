import json
import sys
import os

def check_psalms(file_path, var_name):
    print(f"--- Checking {file_path} ---")
    try:
        if not os.path.exists(file_path):
             print(f"File not found: {file_path}")
             return

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # unique to this assignment: files have 'window.VAR = ' prefix
            if ' = ' in content:
                json_str = content.split(' = ', 1)[1].strip()
                if json_str.endswith(';'):
                    json_str = json_str[:-1]
            else:
                json_str = content
            
            data = json.loads(json_str)
            
            # Find Psalms (BookId 19)
            psalms = next((b for b in data['Books'] if b.get('BookId') == 19), None)
            if not psalms:
                print("Psalms not found!")
                return

            # Check Chap 22
            ch22 = next((c for c in psalms['Chapters'] if c['ChapterId'] == 22), None)
            if ch22:
                v1 = next((v for v in ch22['Verses'] if v['VerseId'] == 1), None)
                print(f"Psalm 22:1 -> {v1['Text'][:60]}...")
            
            # Check Chap 23
            ch23 = next((c for c in psalms['Chapters'] if c['ChapterId'] == 23), None)
            if ch23:
                v1 = next((v for v in ch23['Verses'] if v['VerseId'] == 1), None)
                print(f"Psalm 23:1 -> {v1['Text'][:60]}...")

    except Exception as e:
        print(f"Error: {e}")

check_psalms('/Users/sherzat/Desktop/vibe coding/bible /app/js/data/bible_data.js', 'BIBLE_DATA')
check_psalms('/Users/sherzat/Desktop/vibe coding/bible /app/js/data/nrt_data.js', 'NRT_DATA')
