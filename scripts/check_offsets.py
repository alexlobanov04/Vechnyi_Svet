import json
import os

def check_range(file_path):
    print(f"--- Checking {os.path.basename(file_path)} ---")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if ' = ' in content:
                json_str = content.split(' = ', 1)[1].strip().rstrip(';')
            else:
                json_str = content
            
            data = json.loads(json_str)
            psalms = next((b for b in data['Books'] if b.get('BookId') == 19), None)
            
            if not psalms: return

            targets = [9, 10, 11, 22, 23, 113, 114, 115, 116, 146, 147]
            for cid in targets:
                chap = next((c for c in psalms['Chapters'] if c['ChapterId'] == cid), None)
                if chap:
                    v1 = next((v for v in chap['Verses'] if v['VerseId'] == 1), None)
                    print(f"CH {cid}: {v1['Text'][:40]}...")
                else:
                    print(f"CH {cid}: MISSING")

    except Exception as e:
        print(f"Error ({file_path}): {e}")

check_range('/Users/sherzat/Desktop/vibe coding/bible /app/js/data/bible_data.js')
check_range('/Users/sherzat/Desktop/vibe coding/bible /app/js/data/nrt_data.js')
