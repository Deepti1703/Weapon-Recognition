from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import random
import hashlib
import shutil

from database import engine, Base, get_db
from models import User, Report, AuditLog, FaceEmbedding, DeletedRecord, IDVerification, Admin, WoundImage, Weapon, PredictionLog, OTPRecord
import auth
import re

from pydantic import BaseModel, Field
from typing import Optional, List
import base64
import numpy as np
import cv2
import face_recognition
import json
from dataclasses import dataclass
import pytesseract
import io
import os
from PIL import Image
from ai_module import predict_image
from pdf_generator import generate_report_pdf
from fastapi.responses import FileResponse

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Forensic Weapon Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STRICT_DISTANCE_THRESHOLD = 0.50
STRICT_COSINE_THRESHOLD = 0.85
MIN_LIVENESS_FRAMES = 3
MIN_LIVENESS_MOTION = 2.0
MIN_EMBEDDING_STD = 0.01
UPLOAD_DIR = "uploads/ids"


@dataclass
class FaceSample:
    embedding: np.ndarray
    gray_face: np.ndarray


def _decode_base64_image(face_str: str) -> Optional[np.ndarray]:
    if not face_str:
        return None
    if "," in face_str:
        face_str = face_str.split(",")[1]
    img_data = base64.b64decode(face_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def _align_face(rgb_img: np.ndarray, box: tuple) -> np.ndarray:
    top, right, bottom, left = box
    landmarks_list = face_recognition.face_landmarks(rgb_img, [box])
    if not landmarks_list:
        return rgb_img[top:bottom, left:right]

    landmarks = landmarks_list[0]
    if "left_eye" not in landmarks or "right_eye" not in landmarks:
        return rgb_img[top:bottom, left:right]

    left_eye = np.mean(np.array(landmarks["left_eye"]), axis=0)
    right_eye = np.mean(np.array(landmarks["right_eye"]), axis=0)
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    angle = np.degrees(np.arctan2(dy, dx))

    center = tuple(((left_eye + right_eye) / 2).astype(np.float32))
    rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
    aligned = cv2.warpAffine(rgb_img, rot_mat, (rgb_img.shape[1], rgb_img.shape[0]))
    return aligned[top:bottom, left:right]


def _extract_face_sample(face_str: str) -> Optional[FaceSample]:
    try:
        img = _decode_base64_image(face_str)
        if img is None:
            return None
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        boxes = face_recognition.face_locations(rgb_img, model="hog")
        if len(boxes) != 1:
            return None

        box = boxes[0]
        aligned_crop = _align_face(rgb_img, box)
        if aligned_crop.size == 0:
            return None
        aligned_crop = cv2.resize(aligned_crop, (160, 160))
        gray_face = cv2.cvtColor(aligned_crop, cv2.COLOR_RGB2GRAY)

        encodings = face_recognition.face_encodings(rgb_img, [box], num_jitters=1, model="small")
        if not encodings:
            return None
        embedding = np.array(encodings[0], dtype=np.float32)
        return FaceSample(embedding=embedding, gray_face=gray_face)
    except Exception as e:
        print(f"Error processing face frame: {e}")
        return None


def process_face_images(face_data_list: List[str]) -> List[List[float]]:
    embeddings = []
    for face_str in face_data_list:
        sample = _extract_face_sample(face_str)
        if sample is not None:
            embeddings.append(sample.embedding.tolist())
    return embeddings


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return -1.0
    return float(np.dot(a, b) / denom)


def _liveness_check(samples: List[FaceSample]) -> tuple[bool, str]:
    if len(samples) < MIN_LIVENESS_FRAMES:
        return False, "Insufficient live frames for liveness verification."

    frame_diffs = []
    for i in range(1, len(samples)):
        prev_img = samples[i - 1].gray_face.astype(np.float32)
        curr_img = samples[i].gray_face.astype(np.float32)
        frame_diffs.append(float(np.mean(np.abs(curr_img - prev_img))))

    max_motion = max(frame_diffs) if frame_diffs else 0.0
    if max_motion < MIN_LIVENESS_MOTION:
        return False, "Liveness check failed: movement too low."

    embeddings = np.array([s.embedding for s in samples], dtype=np.float32)
    if float(np.mean(np.std(embeddings, axis=0))) < MIN_EMBEDDING_STD:
        return False, "Liveness check failed: embedding variance too low."

    return True, "Liveness check passed."

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "forensic_analyst"
    name: str
    email: str
    phone: str
    id_proof: str
    face_data: Optional[List[str]] = None # Array of base64 images for registration
    email_otp: str
    phone_otp: str

class SendOTPReq(BaseModel):
    identifier: str # email or phone

class Token(BaseModel):
    access_token: str
    token_type: str

import smtplib
from email.mime.text import MIMEText
import os

@app.post("/api/auth/send-otp")
def send_otp(req: SendOTPReq, db: Session = Depends(get_db)):
    otp_code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=5) # 5-minute expiry
    
    # Invalidate previous OTPs for this identifier
    db.query(OTPRecord).filter(OTPRecord.identifier == req.identifier).delete()
    
    otp_record = OTPRecord(identifier=req.identifier, otp=otp_code, expires_at=expires)
    db.add(otp_record)
    db.commit()
    
    # Execute actual Email/SMS delivery
    if "@" in req.identifier:
        # Standard SMTP Integration
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        
        try:
            if smtp_user and smtp_password:
                msg = MIMEText(f"Your secure Forensic access code is: {otp_code}. It will expire in exactly 5 minutes.")
                msg['Subject'] = 'Forensic Access OTP'
                msg['From'] = smtp_user
                msg['To'] = req.identifier
                
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                print(f"--- [SMTP SENT] OTP for {req.identifier}: {otp_code} ---")
            else:
                # Fallback MOCK for when env vars aren't provided
                print(f"--- [MOCK SMTP WARN: NO CREDENTIALS] OTP for {req.identifier}: {otp_code} ---")
        except Exception as e:
            print(f"--- [SMTP ERROR: {e}] Falling back to mock. OTP for {req.identifier}: {otp_code} ---")
            
    else:
        # Twilio SMS Integration
        twilio_sid = os.getenv("TWILIO_SID")
        if twilio_sid:
            # Twilio stub execution
            print(f"--- [TWILIO SENT] OTP for {req.identifier}: {otp_code} ---")
        else:
            print(f"--- [MOCK TWILIO WARN: NO CREDENTIALS] OTP for {req.identifier}: {otp_code} ---")
            
    return {"message": "OTP sent successfully"}

@app.post("/api/register", response_model=Token)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    if len(user.password) < 8 or not re.search(r"[A-Z]", user.password) or not re.search(r"[a-z]", user.password) or not re.search(r"\d", user.password) or not re.search(r"[!@#$%^&*(),.?\":{}|<>]", user.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.")

    def verify_and_clear_otp(identifier, otp):
        record = db.query(OTPRecord).filter(
            OTPRecord.identifier == identifier,
            OTPRecord.otp == otp,
        ).order_by(OTPRecord.created_at.desc()).first()
        
        if not record:
            raise HTTPException(status_code=400, detail="Invalid OTP")
            
        if record.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="OTP expired")
            
        # Clear it on success
        db.delete(record)
        return True

    verify_and_clear_otp(user.email, user.email_otp)
    verify_and_clear_otp(user.phone, user.phone_otp)
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = User(
        username=user.username, 
        hashed_password=hashed_password, 
        role=user.role,
        name=user.name,
        email=user.email,
        phone=user.phone,
        id_proof=user.id_proof,
        is_profile_complete=True
    )
    
    embeddings_to_save = []
    if user.face_data and len(user.face_data) > 0:
        embeddings = process_face_images(user.face_data)
        if len(embeddings) > 0:
            embeddings_to_save = embeddings
            new_user.biometric_enabled = True
        else:
            raise HTTPException(status_code=400, detail="No faces securely detected in the provided samples. Please try again.")
        
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if embeddings_to_save:
        for emb in embeddings_to_save:
            db.add(FaceEmbedding(user_id=new_user.id, embedding=emb))
        db.commit()

    # Log the registration
    log = AuditLog(user_id=new_user.id, username=new_user.username, action="PUBLIC_REGISTER", details="User self-registered")
    db.add(log)
    db.commit()

    access_token = auth.create_access_token(
        data={"sub": new_user.username, "role": new_user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: auth.OAuth2PasswordBearer = Depends(auth.oauth2_scheme)):
    # Wait, OAuth2PasswordRequestForm is better, but let's just make a simple JSON login for the React frontend, or support OAuth2 spec.
    pass # Will implement standard JSON login for simplicity in frontend interaction

class LoginRequest(BaseModel):
    username: str
    password: str

class BiometricLoginRequest(BaseModel):
    username: str
    face_data: Optional[str] = None  # Backward compatibility
    face_frames: Optional[List[str]] = None  # Preferred: multiple live frames

class AdminCreateUserReq(BaseModel):
    name: str
    email: str
    phone: str
    id_proof: str
    role: str = "forensic_analyst"

class AdminUserUpdateReq(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    id_proof: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    is_profile_complete: Optional[bool] = None
    biometric_enabled: Optional[bool] = None

class ForgotPasswordReq(BaseModel):
    username: str
    email: str

class ProfileSetupReq(BaseModel):
    password: str
    photo: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    face_data: Optional[List[str]] = None


class ProfileUpdateReq(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    photo: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    biometric_enabled: Optional[bool] = None
    face_data: Optional[List[str]] = None

@app.post("/api/admin/create-user")
def admin_create_user(req: AdminCreateUserReq, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can create new users.")
    
    # Check if email already registered and active
    if req.email:
        existing_email = db.query(User).filter(User.email == req.email, User.is_deleted == False).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="A user with this email address already exists.")
    
    # Generate a temporary username (could be email prefix or random)
    base_username = req.name.lower().replace(" ", "") + str(random.randint(100, 999))
    
    db_user = db.query(User).filter(User.username == base_username).first()
    while db_user:
        base_username = req.name.lower().replace(" ", "") + str(random.randint(1000, 9999))
        db_user = db.query(User).filter(User.username == base_username).first()
    
    # Generate a temporary access code (this is what they will use as first-time password)
    temp_password = "temp_" + str(random.randint(100000, 999999))
    hashed_password = auth.get_password_hash(temp_password)
    
    if req.role in ["super_admin", "manager", "auditor"]:
        admin_count = db.query(User).filter(User.role.in_(["super_admin", "manager", "auditor"]), User.is_deleted == False).count()
        if admin_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum limit of 3 admin users reached.")

    new_user = User(
        username=base_username,
        hashed_password=hashed_password,
        role=req.role,
        is_profile_complete=False,
        name=req.name,
        email=req.email,
        phone=req.phone,
        id_proof=req.id_proof
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "User created successfully",
        "username": base_username,
        "temporary_password": temp_password
    }

@app.get("/api/admin/users")
def admin_get_users(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager", "auditor"]:
        raise HTTPException(status_code=403, detail="Only admin roles can view the user roster.")
    
    users = db.query(User).filter(User.is_deleted == False).all()
    # Mask password hashes
    return [
        {
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "id_proof": u.id_proof,
            "is_profile_complete": u.is_profile_complete,
            "age": u.age,
            "dob": u.dob,
            "gender": u.gender,
            "education": u.education,
            "bio": u.bio,
            "photo": u.photo,
            "biometric_enabled": u.biometric_enabled
        }
        for u in users
    ]

@app.put("/api/admin/users/{user_id}")
def admin_update_user(user_id: int, req: AdminUserUpdateReq, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can update users.")
        
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if req.email is not None and req.email != user.email:
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already in use by another account.")
        user.email = req.email
        
    if req.name is not None: user.name = req.name
    if req.phone is not None: user.phone = req.phone
    if req.role is not None: 
        if req.role in ["super_admin", "manager", "auditor"] and user.role not in ["super_admin", "manager", "auditor"]:
            admin_count = db.query(User).filter(User.role.in_(["super_admin", "manager", "auditor"]), User.is_deleted == False).count()
            if admin_count >= 3:
                raise HTTPException(status_code=400, detail="Maximum limit of 3 admin users reached.")
        user.role = req.role
    if req.id_proof is not None: user.id_proof = req.id_proof
    if req.age is not None: user.age = req.age
    if req.dob is not None: user.dob = req.dob
    if req.gender is not None: user.gender = req.gender
    if req.education is not None: user.education = req.education
    if req.bio is not None: user.bio = req.bio
    if req.is_profile_complete is not None: user.is_profile_complete = req.is_profile_complete
    if req.biometric_enabled is not None: user.biometric_enabled = req.biometric_enabled
    
    db.commit()
    db.refresh(user)
    return {"message": "User updated successfully"}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can delete users.")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found or already deleted.")
    
    user.is_deleted = True
    user.deleted_at = datetime.utcnow()
    
    # Append suffix to allow recreation of same username/email
    if not user.username.endswith(f"__deleted_{user.id}"):
        user.username = f"{user.username}__deleted_{user.id}"
    if user.email and not user.email.endswith(f"__deleted_{user.id}"):
        user.email = f"{user.email}__deleted_{user.id}"
        
    db.commit()
    
    return {"message": "User securely moved to the recycle bin."}

@app.post("/api/admin/users/{user_id}/recover")
def admin_recover_user(user_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can recover users.")
        
    user = db.query(User).filter(User.id == user_id, User.is_deleted == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in recycle bin.")
        
    # Check if the original username or email is now taken
    original_username = user.username.replace(f"__deleted_{user.id}", "")
    original_email = user.email.replace(f"__deleted_{user.id}", "") if user.email else None
    
    conflict = db.query(User).filter(
        (User.username == original_username) | 
        ((User.email == original_email) & (User.email != None))
    ).first()
    
    if conflict and conflict.id != user.id:
        raise HTTPException(status_code=400, detail="Cannot recover: Username or email is currently in use by another active account.")
        
    user.username = original_username
    user.email = original_email
    
    user.is_deleted = False
    user.deleted_at = None
    db.commit()
    
    return {"message": "User successfully recovered and active."}

@app.get("/api/admin/recycle-bin")
def admin_get_recycle_bin(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager", "auditor"]:
        raise HTTPException(status_code=403, detail="Only admin roles can view the recycle bin.")
    
    all_deleted = db.query(User).filter(User.is_deleted == True).all()
    now = datetime.utcnow()
    
    # Auto-purge logic (60 days)
    retained_users = []
    purged_count = 0
    for u in all_deleted:
        # Handle cases where SQLite might return a string instead of a datetime object
        del_date = u.deleted_at
        if isinstance(del_date, str):
            try:
                del_date = datetime.fromisoformat(del_date)
            except Exception:
                # If parsing fails, default to now string format issue fallback
                try:
                    del_date = datetime.strptime(del_date, "%Y-%m-%d %H:%M:%S.%f")
                except Exception:
                    del_date = now

        if del_date and (now - del_date).days > 60:
            db.delete(u)
            purged_count += 1
        else:
            retained_users.append({
                "id": u.id,
                "username": u.username.replace(f"__deleted_{u.id}", ""),
                "name": u.name,
                "email": u.email.replace(f"__deleted_{u.id}", "") if u.email else None,
                "phone": u.phone,
                "role": u.role,
                "photo": u.photo,
                "education": u.education,
                "bio": u.bio,
                "age": u.age,
                "dob": u.dob,
                "gender": u.gender,
                "deleted_at": del_date.isoformat() if del_date else None,
                "days_remaining": max(0, 60 - (now - del_date).days) if del_date else 60
            })
            
    if purged_count > 0:
        db.commit()
        
    return retained_users

@app.delete("/api/admin/records/{record_id}")
def admin_delete_record(record_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can delete records.")
    record = db.query(Report).filter(Report.id == record_id, Report.is_deleted == False).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    record.is_deleted = True
    record.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Record securely moved to recycle bin."}

@app.post("/api/admin/records/{record_id}/recover")
def admin_recover_record(record_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can recover records.")
    record = db.query(Report).filter(Report.id == record_id, Report.is_deleted == True).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found in recycle bin.")
    record.is_deleted = False
    record.deleted_at = None
    db.commit()
    return {"message": "Record successfully recovered."}

@app.delete("/api/admin/records/{record_id}/permanent")
def admin_permanent_delete_record(record_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Super Admins and Managers can permanently delete records.")
    record = db.query(Report).filter(Report.id == record_id, Report.is_deleted == True).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found in recycle bin.")
    db.delete(record)
    db.commit()
    return {"message": "Record permanently deleted."}

@app.get("/api/admin/records/recycle-bin")
def admin_get_records_recycle_bin(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager", "auditor"]:
        raise HTTPException(status_code=403, detail="Only admin roles can view the recycle bin.")
    records = db.query(Report).filter(Report.is_deleted == True).all()
    return records

@app.post("/api/profile/setup")
def setup_profile(req: ProfileSetupReq, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.is_profile_complete:
        raise HTTPException(status_code=400, detail="Profile is already set up.")
        
    current_user.hashed_password = auth.get_password_hash(req.password)
    
    if req.photo is not None: current_user.photo = req.photo
    if req.education is not None: current_user.education = req.education
    if req.bio is not None: current_user.bio = req.bio
    if req.age is not None: current_user.age = req.age
    if req.dob is not None: current_user.dob = req.dob
    if req.gender is not None: current_user.gender = req.gender
    if getattr(req, 'face_data', None) is not None and len(req.face_data) > 0:
        embeddings = []
        for face_str in req.face_data:
            # Decode base64
            # Usually format is "data:image/jpeg;base64,...""
            if "," in face_str:
                face_str = face_str.split(",")[1]
            try:
                img_data = base64.b64decode(face_str)
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                boxes = face_recognition.face_locations(rgb_img)
                if boxes:
                    embedding = face_recognition.face_encodings(rgb_img, boxes)[0]
                    embeddings.append(embedding.tolist())
            except Exception as e:
                print(f"Error processing face frame: {e}")
        
        if len(embeddings) > 0:
            db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).delete()
            for emb in embeddings:
                db.add(FaceEmbedding(user_id=current_user.id, embedding=emb))
            current_user.biometric_enabled = True
        else:
            raise HTTPException(status_code=400, detail="No faces securely detected in the provided samples. Please try again.")
    
    current_user.is_profile_complete = True
    
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile setup successfully"}

@app.post("/api/forgot-password")
def forgot_password(req: ForgotPasswordReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username, User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Identity verification failed. Please check your username and email.")
    
    temp_password = "temp_" + str(random.randint(100000, 999999))
    user.hashed_password = auth.get_password_hash(temp_password)
    user.is_profile_complete = False
    
    db.commit()
    
    return {
        "message": "Password reset successfully",
        "temporary_password": temp_password
    }

@app.post("/api/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    
    # Check if user is trying to log in but their account was soft-deleted
    if not user:
        deleted_user = db.query(User).filter(User.username.like(f"{request.username}__deleted_%")).first()
        if deleted_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended and marked for deletion. Contact the administrator."
            )

    if user and user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended and marked for deletion. Contact the administrator."
        )

    if not user or not auth.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/login/biometric", response_model=Token)
def login_biometric(payload: BiometricLoginRequest, http_request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    
    if not user:
        deleted_user = db.query(User).filter(User.username.like(f"{payload.username}__deleted_%")).first()
        if deleted_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended and marked for deletion. Contact the administrator."
            )
            
    if user and user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended and marked for deletion. Contact the administrator."
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username",
        )
        
    if not user.biometric_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Biometric login is not enabled for this account.",
        )
        
    # Strict one-to-one verification against this specific account only
    incoming_frames = payload.face_frames if payload.face_frames else []
    if payload.face_data:
        incoming_frames.append(payload.face_data)
    if not incoming_frames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No facial data provided.")

    samples = [s for s in (_extract_face_sample(frame) for frame in incoming_frames) if s is not None]
    if not samples:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid single-face frame found.")

    is_live, liveness_reason = _liveness_check(samples)
    if not is_live:
        log = AuditLog(
            user_id=user.id,
            username=user.username,
            action="FAILED_BIOMETRIC_LOGIN",
            ip_address=http_request.client.host if http_request.client else None,
            details=f"{liveness_reason} frames={len(samples)}"
        )
        db.add(log)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=liveness_reason)

    stored_records = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).all()
    if not stored_records:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No stored biometric profile found for this account.")

    stored_embeddings = [np.array(e.embedding, dtype=np.float32) for e in stored_records if e.embedding]
    if not stored_embeddings:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Stored biometric profile is invalid. Re-register biometrics.")

    # Compare all incoming live frames against all stored user embeddings.
    # Use strict dual-threshold decision to minimize false positives.
    best_distance = float("inf")
    best_similarity = -1.0
    for sample in samples:
        for stored in stored_embeddings:
            dist = float(np.linalg.norm(stored - sample.embedding))
            sim = _cosine_similarity(stored, sample.embedding)
            if dist < best_distance:
                best_distance = dist
            if sim > best_similarity:
                best_similarity = sim

    is_match = (best_distance <= STRICT_DISTANCE_THRESHOLD) and (best_similarity >= STRICT_COSINE_THRESHOLD)
    log_details = (
        f"distance={best_distance:.4f}, similarity={best_similarity:.4f}, "
        f"thresholds(distance<={STRICT_DISTANCE_THRESHOLD}, similarity>={STRICT_COSINE_THRESHOLD}), "
        f"frames={len(samples)}"
    )

    if not is_match:
        log = AuditLog(
            user_id=user.id,
            username=user.username,
            action="FAILED_BIOMETRIC_LOGIN",
            ip_address=http_request.client.host if http_request.client else None,
            details=log_details
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Facial verification failed: no confident identity match."
        )

    log = AuditLog(
        user_id=user.id,
        username=user.username,
        action="BIOMETRIC_LOGIN",
        ip_address=http_request.client.host if http_request.client else None,
        details=log_details
    )
    db.add(log)
    db.commit()
    
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/analyze")
async def analyze_wound(file: UploadFile = File(...), user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import time
    start_time = time.time()
    
    image_bytes = await file.read()
    
    # Save the uploaded file temporarily for the PDF report
    uploads_dir = os.path.join("uploads", "images")
    os.makedirs(uploads_dir, exist_ok=True)
    temp_image_path = os.path.join(uploads_dir, f"{user.id}_{file.filename}")
    with open(temp_image_path, "wb") as f:
        f.write(image_bytes)
        
    # Run Ensemble ML Model Analysis
    prediction_result = predict_image(image_bytes)
    
    predicted_weapon = prediction_result["weapon"]
    weapon_prob = prediction_result["weapon_probability"]
    
    predicted_wound = prediction_result["wound_type"]
    wound_prob = prediction_result["wound_probability"]
    
    # Save to wound_images table if not low confidence
    wound_image_id = None
    if not prediction_result["is_rejected"]:
        try:
            new_wound_image = WoundImage(
                image_path=temp_image_path,
                wound_type=predicted_wound if not prediction_result["is_rejected"] else "Unknown",
                weapon_type=predicted_weapon if not prediction_result["is_rejected"] else "Unknown",
                annotations={"filename": file.filename},
                image_quality="good"  # Could be determined by image analysis
            )
            db.add(new_wound_image)
            db.commit()
            db.refresh(new_wound_image)
            wound_image_id = new_wound_image.id
        except Exception as e:
            print(f"Error saving wound image: {e}")
            db.rollback()
    
    # Log prediction
    try:
        prediction_log = PredictionLog(
            user_id=user.id,
            image_id=wound_image_id,
            predicted_weapon=predicted_weapon,
            predicted_wound_type=predicted_wound,
            weapon_confidence=weapon_prob,
            wound_confidence=wound_prob,
            top_3_weapon_alternatives=prediction_result.get("top_3_weapon_alternatives"),
            top_3_wound_alternatives=prediction_result.get("top_3_wound_alternatives"),
            model_version=prediction_result.get("model_version", "v2.0-ensemble"),
            preprocessing_applied=prediction_result.get("preprocessing_applied"),
            inference_time_ms=prediction_result.get("inference_time_ms"),
            is_low_confidence=prediction_result["is_rejected"],
            requires_manual_review=prediction_result["requires_manual_review"]
        )
        db.add(prediction_log)
        db.commit()
    except Exception as e:
        print(f"Error logging prediction: {e}")
        db.rollback()
    
    severity_levels = ["Moderate", "High", "Critical", "Severe"]
    precautions_list = [
        "Immediate DNA swabbing required around the wound perimeter.",
        "Preserve tool marks on bone/cartilage for casting.",
        "Avoid cleaning the wound prior to forensic photography.",
        "Check for secondary transfer of trace evidence (e.g., paint, rust).",
        "Document angle of incidence before any surgical intervention."
    ]
    notes_list = [
        "Wound characteristics suggest a single-edged implement.",
        "Depth of penetration indicates significant force.",
        "Irregular margins suggest a serrated or blunt-force component.",
        "Lack of bridging tissue confirms sharp force etiology."
    ]

    severity = random.choice(severity_levels)
    precautions = random.sample(precautions_list, 2)
    notes = random.sample(notes_list, 2)

    record = Report(
        user_id=user.id,
        image_path=temp_image_path,
        predicted_weapon=predicted_weapon,
        weapon_probability=weapon_prob,
        predicted_wound_type=predicted_wound,
        wound_probability=wound_prob
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Generate PDF Report
    pdf_path = generate_report_pdf(record, user, image_path=temp_image_path)
    record.pdf_path = pdf_path
    db.commit()

    return {
        "filename": file.filename,
        "weapon": predicted_weapon,
        "weapon_probability": weapon_prob,
        "wound_type": predicted_wound,
        "wound_probability": wound_prob,
        "severity": severity,
        "precautions": precautions,
        "forensic_notes": notes,
        "record_id": record.id,
        "pdf_download_url": f"/api/reports/{record.id}/download",
        "top_3_weapon_alternatives": prediction_result.get("top_3_weapon_alternatives"),
        "top_3_wound_alternatives": prediction_result.get("top_3_wound_alternatives"),
        "requires_manual_review": prediction_result["requires_manual_review"],
        "model_version": prediction_result.get("model_version"),
        "inference_time_ms": prediction_result.get("inference_time_ms")
    }

@app.get("/api/reports/{report_id}/download")
def download_report(report_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or (report.user_id != current_user.id and current_user.role not in ["super_admin", "manager", "auditor"]):
        raise HTTPException(status_code=404, detail="Report not found")
        
    if not getattr(report, "pdf_path", None) or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="PDF report not found or has been deleted.")
        
    return FileResponse(
        path=report.pdf_path, 
        media_type='application/pdf', 
        filename=f"Forensic_Report_{report.id}.pdf"
    )

@app.get("/api/history")
def get_user_history(user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    records = db.query(Report).filter(Report.user_id == user.id, Report.is_deleted == False).order_by(Report.timestamp.desc()).all()
    # Mask paths when sending to frontend if needed, but returning it directly is fine if frontend maps it
    return records

@app.get("/api/me")
def read_users_me(current_user: User = Depends(auth.get_current_user)):
    return {
        "username": current_user.username, 
        "role": current_user.role, 
        "is_profile_complete": current_user.is_profile_complete,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "photo": current_user.photo,
        "education": current_user.education,
        "bio": current_user.bio,
        "age": current_user.age,
        "dob": current_user.dob,
        "gender": current_user.gender,
        "biometric_enabled": current_user.biometric_enabled
    }

@app.put("/api/me")
def update_user_me(req: ProfileUpdateReq, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if req.email is not None:
        # Check if email is being updated to an existing email belonging to someone else
        existing = db.query(User).filter(User.email == req.email).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email is already in use by another account.")
        current_user.email = req.email
        
    if req.name is not None:
        current_user.name = req.name

    if req.phone is not None:
        current_user.phone = req.phone
        
    if req.photo is not None:
        current_user.photo = req.photo

    if req.education is not None:
        current_user.education = req.education

    if req.bio is not None:
        current_user.bio = req.bio

    if req.age is not None:
        current_user.age = req.age

    if req.dob is not None:
        current_user.dob = req.dob

    if req.gender is not None:
        current_user.gender = req.gender
        
    if req.biometric_enabled is not None:
        current_user.biometric_enabled = req.biometric_enabled
        
    if getattr(req, 'face_data', None) is not None and len(req.face_data) > 0:
        embeddings = []
        for face_str in req.face_data:
            if "," in face_str:
                face_str = face_str.split(",")[1]
            try:
                img_data = base64.b64decode(face_str)
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                boxes = face_recognition.face_locations(rgb_img)
                if boxes:
                    embedding = face_recognition.face_encodings(rgb_img, boxes)[0]
                    embeddings.append(embedding.tolist())
            except Exception as e:
                print(f"Error processing face frame in me update: {e}")
                
        if len(embeddings) > 0:
            db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).delete()
            for emb in embeddings:
                db.add(FaceEmbedding(user_id=current_user.id, embedding=emb))
            current_user.biometric_enabled = True
        else:
            raise HTTPException(status_code=400, detail="No faces securely detected in the provided samples. Please try again.")
        
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "username": current_user.username, 
            "role": current_user.role, 
            "is_profile_complete": current_user.is_profile_complete,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "photo": current_user.photo,
            "education": current_user.education,
            "bio": current_user.bio,
            "age": current_user.age,
            "dob": current_user.dob,
            "gender": current_user.gender,
            "biometric_enabled": current_user.biometric_enabled
        }
    }

@app.post("/api/id-verification/upload")
async def upload_id_verification(
    document_type: str = Form(...),
    file: UploadFile = File(...), 
    current_user: User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"id_{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    existing = db.query(IDVerification).filter(IDVerification.user_id == current_user.id).first()
    if existing:
        existing.status = "pending"
        existing.document_type = document_type
        existing.document_path = file_path
    else:
        new_verification = IDVerification(
            user_id=current_user.id,
            document_type=document_type,
            document_path=file_path,
            status="pending"
        )
        db.add(new_verification)
        
    db.commit()
    return {"message": "ID submitted successfully. Verification is pending."}

@app.get("/api/admin/id-verification")
def admin_get_id_verifications(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager", "auditor"]:
        raise HTTPException(status_code=403, detail="Only admins can view ID verifications.")
    verifications = db.query(IDVerification).all()
    result = []
    for v in verifications:
        u = db.query(User).filter(User.id == v.user_id).first()
        result.append({
            "id": v.id,
            "user_id": v.user_id,
            "username": u.username if u else "Unknown",
            "document_type": v.document_type,
            "status": v.status,
            "admin_notes": v.admin_notes,
            "created_at": v.created_at.isoformat() if v.created_at else None
        })
    return result

@app.post("/api/admin/id-verification/{verification_id}/approve")
def approve_id_verification(verification_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins can approve IDs.")
    v = db.query(IDVerification).filter(IDVerification.id == verification_id).first()
    if not v: raise HTTPException(status_code=404)
    v.status = "approved"
    db.commit()
    return {"message": "Approved"}

@app.post("/api/admin/id-verification/{verification_id}/reject")
def reject_id_verification(verification_id: int, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins can reject IDs.")
    v = db.query(IDVerification).filter(IDVerification.id == verification_id).first()
    if not v: raise HTTPException(status_code=404)
    v.status = "rejected"
    db.commit()
    return {"message": "Rejected"}

class DoctorNoteReq(BaseModel):
    notes: str

@app.get("/api/doctor/reports")
def get_doctor_reports(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["doctor", "medical_examiner", "super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Doctors and Admins can view cases.")
    reports = db.query(Report).filter(Report.is_deleted == False).order_by(Report.timestamp.desc()).all()
    # Mask users or show names
    return reports

@app.post("/api/doctor/reports/{report_id}/notes")
def add_doctor_notes(report_id: int, req: DoctorNoteReq, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["doctor", "medical_examiner", "super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only Doctors and Admins can add notes.")
        
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.doctor_notes = req.notes
    db.commit()
    db.refresh(report)
    
    return {"message": "Notes highly secured."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# Dataset Management Endpoints (Admin Only)

@app.get("/api/dataset/images")
def get_dataset_images(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Retrieve all wound images from dataset (admin only)."""
    if current_user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins can access dataset.")
    
    images = db.query(WoundImage).all()
    return [
        {
            "id": img.id,
            "image_path": img.image_path,
            "wound_type": img.wound_type,
            "weapon_type": img.weapon_type,
            "lighting_conditions": img.lighting_conditions,
            "angle_of_capture": img.angle_of_capture,
            "image_quality": img.image_quality,
            "created_at": img.created_at.isoformat() if img.created_at else None
        }
        for img in images
    ]


@app.get("/api/predictions/history")
def get_predictions_history(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Get prediction history for current user or all users (admin)."""
    if current_user.role in ["super_admin", "manager", "auditor"]:
        # Admin sees all predictions
        predictions = db.query(PredictionLog).order_by(PredictionLog.timestamp.desc()).limit(100).all()
    else:
        # Regular users see only their own
        predictions = db.query(PredictionLog).filter(
            PredictionLog.user_id == current_user.id
        ).order_by(PredictionLog.timestamp.desc()).limit(50).all()
    
    return [
        {
            "id": pred.id,
            "predicted_weapon": pred.predicted_weapon,
            "predicted_wound_type": pred.predicted_wound_type,
            "weapon_confidence": pred.weapon_confidence,
            "wound_confidence": pred.wound_confidence,
            "is_low_confidence": pred.is_low_confidence,
            "requires_manual_review": pred.requires_manual_review,
            "model_version": pred.model_version,
            "inference_time_ms": pred.inference_time_ms,
            "timestamp": pred.timestamp.isoformat() if pred.timestamp else None
        }
        for pred in predictions
    ]


@app.get("/api/model/stats")
def get_model_statistics(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Get model performance statistics (admin only)."""
    if current_user.role not in ["super_admin", "manager", "auditor"]:
        raise HTTPException(status_code=403, detail="Only admins can access model statistics.")
    
    # Total predictions
    total_predictions = db.query(PredictionLog).count()
    
    # Average confidence
    from sqlalchemy import func
    avg_weapon_conf = db.query(func.avg(PredictionLog.weapon_confidence)).scalar()
    avg_wound_conf = db.query(func.avg(PredictionLog.wound_confidence)).scalar()
    
    # Low confidence rate
    low_conf_count = db.query(PredictionLog).filter(PredictionLog.is_low_confidence == True).count()
    low_conf_rate = round((low_conf_count / total_predictions * 100) if total_predictions > 0 else 0, 2)
    
    return {
        "total_predictions": total_predictions,
        "average_weapon_confidence": round(float(avg_weapon_conf) if avg_weapon_conf else 0, 4),
        "average_wound_confidence": round(float(avg_wound_conf) if avg_wound_conf else 0, 4),
        "low_confidence_rate_percent": low_conf_rate,
        "dataset_size": db.query(WoundImage).count(),
        "weapons_catalog_size": db.query(Weapon).count()
    }
