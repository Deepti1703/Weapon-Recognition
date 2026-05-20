import sqlite3

def upgrade_db():
    conn = sqlite3.connect('forensic_app.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN dob VARCHAR")
        conn.commit()
        print("Successfully added 'dob' column to 'users' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("'dob' column already exists.")
        else:
            print(f"Error checking/adding column: {e}")
    conn.close()

if __name__ == '__main__':
    upgrade_db()
