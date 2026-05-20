from database import SessionLocal
from models import User

def fix_old_deleted_accounts():
    db = SessionLocal()
    try:
        # Find all deleted users
        deleted_users = db.query(User).filter(User.is_deleted == True).all()
        fixed_count = 0
        
        for user in deleted_users:
            suffix = f"__deleted_{user.id}"
            
            # Apply suffix if it doesn't exist
            needs_update = False
            if not user.username.endswith(suffix):
                user.username = f"{user.username}{suffix}"
                needs_update = True
                
            if user.email and not user.email.endswith(suffix):
                user.email = f"{user.email}{suffix}"
                needs_update = True
                
            if needs_update:
                fixed_count += 1
                
        db.commit()
        print(f"Fixed {fixed_count} old deleted accounts successfully.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_old_deleted_accounts()
