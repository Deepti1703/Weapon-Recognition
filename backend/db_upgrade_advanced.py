import sqlite3

def upgrade_db():
    db_path = "forensic_app.db" # using the large one from list_dir
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE reports ADD COLUMN doctor_notes TEXT;")
        print("Added doctor_notes to reports")
    except sqlite3.OperationalError as e:
        print(f"Column doctor_notes might already exist or error: {e}")

    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier VARCHAR NOT NULL,
            otp VARCHAR NOT NULL,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_otp_records_id ON otp_records (id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_otp_records_identifier ON otp_records (identifier);")
        print("Created otp_records table")
    except sqlite3.OperationalError as e:
        print(f"Error creating otp_records: {e}")

    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade_db()
