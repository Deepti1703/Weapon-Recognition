import sqlite3

def upgrade_db():
    conn = sqlite3.connect('forensic_app.db')
    cursor = conn.cursor()
    
    # Add biometric_enabled to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN biometric_enabled BOOLEAN DEFAULT FALSE")
        print("Successfully added 'biometric_enabled' column to 'users'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("'biometric_enabled' column already exists.")
        else:
            print(f"Error checking/adding biometric_enabled: {e}")

    # Add is_deleted to analysis_records
    try:
        cursor.execute("ALTER TABLE analysis_records ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE")
        print("Successfully added 'is_deleted' column to 'analysis_records'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("'is_deleted' column already exists.")
        else:
            print(f"Error checking/adding is_deleted: {e}")

    # Add deleted_at to analysis_records
    try:
        cursor.execute("ALTER TABLE analysis_records ADD COLUMN deleted_at DATETIME")
        print("Successfully added 'deleted_at' column to 'analysis_records'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("'deleted_at' column already exists.")
        else:
            print(f"Error checking/adding deleted_at: {e}")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    upgrade_db()
