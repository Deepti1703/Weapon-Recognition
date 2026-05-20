"""
Database Migration Script - Add Structured Dataset Tables
This script adds tables for wound_images, weapons, and predictions_log.
Run this AFTER the initial database is set up.
"""

from sqlalchemy import create_engine, text
from database import engine, Base
from models import WoundImage, Weapon, PredictionLog
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    """Create new tables in the existing database."""
    print("Starting database migration...")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')}")
    
    try:
        # Create all new tables
        print("\nCreating new tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created successfully!")
        
        print("\nNew tables added:")
        print("  - wound_images: Store labeled wound images with annotations")
        print("  - weapons: Reference table for weapon types")
        print("  - predictions_log: Detailed prediction logging for model improvement")
        
        # Verify tables exist
        from database import SessionLocal
        db = SessionLocal()
        
        # Check wound_images
        result = db.execute(text("SELECT COUNT(*) FROM wound_images"))
        wound_count = result.scalar()
        print(f"\n✓ wound_images table verified ({wound_count} records)")
        
        # Check weapons
        result = db.execute(text("SELECT COUNT(*) FROM weapons"))
        weapon_count = result.scalar()
        print(f"✓ weapons table verified ({weapon_count} records)")
        
        # Check predictions_log
        result = db.execute(text("SELECT COUNT(*) FROM predictions_log"))
        pred_count = result.scalar()
        print(f"✓ predictions_log table verified ({pred_count} records)")
        
        db.close()
        
        print("\n✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Upload labeled training images to populate wound_images table")
        print("2. Add weapon reference data to weapons table")
        print("3. Model will automatically log predictions to predictions_log")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nTroubleshooting:")
        print("1. Ensure PostgreSQL is running")
        print("2. Check DATABASE_URL in .env file")
        print("3. Make sure you have proper database permissions")
        raise

if __name__ == "__main__":
    run_migration()
