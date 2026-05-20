import sqlite3

def fix_roles():
    conn = sqlite3.connect('forensic_app.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = 'super_admin' WHERE role = 'administrator'")
    conn.commit()
    print(f"Updated {cursor.rowcount} users from 'administrator' to 'super_admin'.")
    conn.close()

if __name__ == '__main__':
    fix_roles()
