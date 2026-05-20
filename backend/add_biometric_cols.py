import sqlite3

def upgrade_db():
    conn = sqlite3.connect('forensic_app.db')
    cursor = conn.cursor()
    
    # Add face_embedding to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN face_embedding VARCHAR")
        print("Successfully added 'face_embedding'.")
    except sqlite3.OperationalError as e:
        pass

    # Add webauthn_credentials to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN webauthn_credentials VARCHAR")
        print("Successfully added 'webauthn_credentials'.")
    except sqlite3.OperationalError as e:
        pass

    conn.commit()
    conn.close()

if __name__ == '__main__':
    upgrade_db()
