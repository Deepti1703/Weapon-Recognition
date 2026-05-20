import sys
import os
from database import engine, Base, SessionLocal
from models import User
import auth

# Remove old DB if it exists to recreate tables properly with new schema since we're using SQLite without alembic migrations
if os.path.exists("./forensic_app.db"):
    os.remove("./forensic_app.db")

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Check if admin user exists
admin = db.query(User).filter(User.username == "deepti").first()
if not admin:
    print("Creating admin user 'deepti'...")
    admin = User(
        username="deepti",
        hashed_password=auth.get_password_hash("Sharada@1703"),
        role="super_admin",
        is_profile_complete=True,
        name="Deepti Admin"
    )
    db.add(admin)
    db.commit()
    print("Admin user created (username: deepti, password: Sharada@1703)")
else:
    print("Admin user already exists.")

db.close()
