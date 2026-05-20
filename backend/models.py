from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime


class WoundImage(Base):
    """Structured dataset table for wound images with annotations."""
    __tablename__ = "wound_images"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, unique=True, index=True)
    wound_type = Column(String, index=True)  # Stab, Incision, Puncture, Laceration, Abrasion
    weapon_type = Column(String, index=True)  # Knife, Screwdriver, Broken Glass, Hammer, Gun, Unknown Edge
    annotations = Column(JSON, nullable=True)  # Bounding boxes, landmarks, etc.
    lighting_conditions = Column(String, nullable=True)  # Good, Poor, Mixed
    angle_of_capture = Column(String, nullable=True)  # Frontal, Oblique, Top-down
    image_quality = Column(String, default="good")  # good, moderate, poor
    is_public = Column(Boolean, default=False)  # For sharing in research dataset
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    predictions = relationship("PredictionLog", back_populates="image")


class Weapon(Base):
    """Reference table for weapon types and their characteristics."""
    __tablename__ = "weapons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    wound_pattern_characteristics = Column(JSON, nullable=True)  # Typical wound patterns
    category = Column(String)  # Sharp, Blunt, Firearm, Other
    typical_severity = Column(String, nullable=True)  # Low, Moderate, High, Critical
    forensic_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PredictionLog(Base):
    """Detailed logging of all model predictions for analysis and improvement."""
    __tablename__ = "predictions_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    image_id = Column(Integer, ForeignKey("wound_images.id"), nullable=True, index=True)
    
    # Primary predictions
    predicted_weapon = Column(String, index=True)
    predicted_wound_type = Column(String, index=True)
    
    # Confidence scores
    weapon_confidence = Column(Float)
    wound_confidence = Column(Float)
    
    # Top alternatives
    top_3_weapon_alternatives = Column(JSON, nullable=True)  # [{weapon: "Knife", confidence: 0.75}, ...]
    top_3_wound_alternatives = Column(JSON, nullable=True)
    
    # Model metadata
    model_version = Column(String, default="v1.0")
    preprocessing_applied = Column(JSON, nullable=True)  # {denoising: true, clahe: true, ...}
    inference_time_ms = Column(Float, nullable=True)
    
    # Quality flags
    is_low_confidence = Column(Boolean, default=False)
    requires_manual_review = Column(Boolean, default=False)
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationships
    image = relationship("WoundImage", back_populates="predictions")
    user = relationship("User")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="forensic_analyst") # Options: forensic_analyst, admin, user
    
    # Profile Setup Fields
    is_profile_complete = Column(Boolean, default=False)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    id_proof = Column(String, nullable=True) # general ID proof path, though we have specific table now
    
    # User added fields
    photo = Column(String, nullable=True)
    education = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    dob = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    biometric_enabled = Column(Boolean, default=False)
    
    # Soft Delete Fields
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    embeddings = relationship("FaceEmbedding", back_populates="user", cascade="all, delete-orphan")
    id_verification = relationship("IDVerification", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    permissions = Column(JSON, nullable=True) # Could store fine-grained permissions if needed

    user = relationship("User")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    embedding = Column(JSON) # JSON array of 128-d / 512-d floats
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="embeddings")


class IDVerification(Base):
    __tablename__ = "id_verification"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    document_type = Column(String) # E.g., Aadhaar, Passport
    document_path = Column(String)
    extracted_data = Column(JSON, nullable=True) # OCR findings
    status = Column(String, default="pending") # pending, approved, rejected
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="id_verification")


class Report(Base):
    """Formerly AnalysisRecord, extended to include PDF reports."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    image_path = Column(String, nullable=True)
    predicted_weapon = Column(String)
    weapon_probability = Column(Float)
    predicted_wound_type = Column(String)
    wound_probability = Column(Float)
    pdf_path = Column(String, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Soft Delete Fields
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    username = Column(String, index=True, nullable=True)
    action = Column(String, index=True)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class DeletedRecord(Base):
    """Recycle bin functionality."""
    __tablename__ = "deleted_records"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String, index=True) # 'User', 'Report', etc.
    original_id = Column(Integer, index=True)
    deleted_data = Column(JSON, nullable=True)
    deleted_by = Column(String, nullable=True)
    deleted_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class OTPRecord(Base):
    __tablename__ = "otp_records"
    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, index=True) # email or phone number
    otp = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
