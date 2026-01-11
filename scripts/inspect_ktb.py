import zipfile
import sqlite3
import os
import shutil

# Paths
zip_path = 'sources/kaz_bible.zip'
temp_dir = 'temp_inspect'
db_name = "KTB'22.SQLite3" # Guessed name inside zip, based on convert_ktb.py

def inspect():
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)

    print(f"Extracting {zip_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            # list files to find the sqlite
            for n in z.namelist():
                print(f"  Found file in zip: {n}")
                if n.endswith('.SQLite3'):
                    z.extract(n, temp_dir)
                    extracted_db = os.path.join(temp_dir, n)
    except Exception as e:
        print(f"Error extracting: {e}")
        return

    # Find the extracted DB
    db_file = None
    for root, dirs, files in os.walk(temp_dir):
        for f in files:
            if f.endswith('.SQLite3'):
                db_file = os.path.join(root, f)
                break
    
    if not db_file:
        print("No SQLite3 file found.")
        return

    print(f"Connecting to {db_file}...")
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    print("\n--- Books in DB (ordered by book_number) ---")
    try:
        cursor.execute("SELECT book_number, short_name, long_name FROM books ORDER BY book_number")
        rows = cursor.fetchall()
        for r in rows:
            print(f"No: {r[0]} | Short: {r[1]} | Long: {r[2]}")
    except Exception as e:
        print(f"Error querying books: {e}")

    conn.close()
    
    # Cleanup
    # shutil.rmtree(temp_dir)

if __name__ == "__main__":
    inspect()
