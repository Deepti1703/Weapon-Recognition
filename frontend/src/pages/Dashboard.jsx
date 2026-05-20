import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Webcam from 'react-webcam';
import axios from 'axios';
import { FaSignOutAlt, FaUpload, FaCamera, FaImage, FaHistory, FaBiohazard, FaCheckCircle, FaExclamationTriangle, FaUserShield, FaIdCard, FaEnvelope, FaPhone, FaClock, FaEdit, FaSave, FaTimes, FaGraduationCap, FaUser, FaFileAlt } from 'react-icons/fa';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from './DoctorDashboard';
import ReportGenerator from '../components/ReportGenerator';
import Precautions from '../components/Precautions';
import BiometricAuth from '../components/BiometricAuth';
import { FaStethoscope } from 'react-icons/fa';

const Dashboard = () => {
 const { user, logout, updateUser } = useAuth();
 const { isDarkMode, toggleTheme } = useTheme();
 const toast = useToast();
 const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'camera', 'history', 'admin', 'profile'
 const [selectedFile, setSelectedFile] = useState(null);
 const [previewUrl, setPreviewUrl] = useState(null);
 const [analysisResult, setAnalysisResult] = useState(null);
 const [loading, setLoading] = useState(false);
 const [history, setHistory] = useState([]);
 const [showReport, setShowReport] = useState(false);

 // Profile Edit State
 const [isEditingProfile, setIsEditingProfile] = useState(false);
 const [isSavingProfile, setIsSavingProfile] = useState(false);
 const [showBiometricAuth, setShowBiometricAuth] = useState(false);
 const [editProfileForm, setEditProfileForm] = useState({ name: '', email: '', phone: '', photo: '', age: '', dob: '', gender: '', education: '', bio: '', biometric_enabled: false, face_data: [] });

 const webcamRef = useRef(null);

 const handleFileChange = (e) => {
 if (e.target.files && e.target.files[0]) {
 const file = e.target.files[0];
 setSelectedFile(file);
 setPreviewUrl(URL.createObjectURL(file));
 setAnalysisResult(null);
 }
 };

 const capture = useCallback(() => {
 const imageSrc = webcamRef.current.getScreenshot();
 if (imageSrc) {
 // Convert base64 to file
 fetch(imageSrc)
 .then(res => res.blob())
 .then(blob => {
 const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
 setSelectedFile(file);
 setPreviewUrl(imageSrc);
 setAnalysisResult(null);
 setActiveTab('upload');
 });
 }
 }, [webcamRef]);

 const handleAnalyze = async () => {
 if (!selectedFile) return;

 setLoading(true);
 const formData = new FormData();
 formData.append('file', selectedFile);

 try {
 const token = localStorage.getItem('token');
 const response = await axios.post('http://127.0.0.1:8000/api/analyze', formData, {
 headers: {
 'Content-Type': 'multipart/form-data',
 'Authorization': `Bearer ${token}`
 }
 });

 setAnalysisResult(response.data);
 } catch (error) {
 console.error("Error analyzing image:", error);
 toast.error("Failed to analyze image. Ensure backend is running.");
 } finally {
 setLoading(false);
 }
 };

 const handleDownloadPDF = async (downloadUrl, recordId) => {
 if (!downloadUrl) return;
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get(`http://127.0.0.1:8000${downloadUrl}`, {
 headers: { 'Authorization': `Bearer ${token}` },
 responseType: 'blob'
 });
 const url = window.URL.createObjectURL(new Blob([response.data]));
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', `Secure_Forensic_Report_${recordId}.pdf`);
 document.body.appendChild(link);
 link.click();
 link.parentNode.removeChild(link);
 } catch (error) {
 console.error("Error downloading PDF:", error);
 toast.error("Failed to download PDF report. It may have been moving or deleted.");
 }
 };

 const loadHistory = async () => {
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get('http://127.0.0.1:8000/api/history', {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 setHistory(response.data);
 } catch (error) {
 console.error("Error fetching history:", error);
 }
 };

 const handleProfilePhotoChange = (e) => {
 const file = e.target.files[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setEditProfileForm(prev => ({ ...prev, photo: reader.result }));
 };
 reader.readAsDataURL(file);
 }
 };

 const handleSaveProfile = async () => {
 setIsSavingProfile(true);
 try {
 const token = localStorage.getItem('token');
 const payload = { ...editProfileForm };
 if (payload.age === '') {
 payload.age = null;
 } else {
 payload.age = parseInt(payload.age, 10);
 }
 const response = await axios.put('http://127.0.0.1:8000/api/me', payload, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 updateUser(response.data.user);
 setIsEditingProfile(false);
 toast.success("Profile updated successfully!");
 } catch (error) {
 console.error("Error updating profile:", error);
 toast.error(error.response?.data?.detail || "Failed to update profile.");
 } finally {
 setIsSavingProfile(false);
 }
 };

 const startEditingProfile = () => {
 setEditProfileForm({
 name: user.name || '',
 email: user.email || '',
 phone: user.phone || '',
 photo: user.photo || '',
 age: user.age || '',
 dob: user.dob || '',
 gender: user.gender || 'Prefer not to say',
 education: user.education || '',
 bio: user.bio || '',
 biometric_enabled: user.biometric_enabled || false,
 face_data: []
 });
 setIsEditingProfile(true);
 };

 const handleBiometricToggle = (e) => {
 if (e.target.checked) {
 setShowBiometricAuth(true);
 } else {
 setEditProfileForm({ ...editProfileForm, biometric_enabled: false, face_data: [] });
 }
 };

 const handleBiometricCapture = (data) => {
 setEditProfileForm({ ...editProfileForm, biometric_enabled: true, face_data: data.face_data });
 setShowBiometricAuth(false);
 };

 const onTabChange = (tab) => {
 setActiveTab(tab);
 if (tab === 'history') {
 loadHistory();
 }
 };

 return (
 <div className="flex h-screen bg-background dark:bg-dark-background overflow-hidden font-sans transition-colors duration-300">
 {showBiometricAuth && (
 <BiometricAuth
 isRegistration={true}
 username={user?.username}
 onVerify={handleBiometricCapture}
 onCancel={() => setShowBiometricAuth(false)}
 />
 )}

 {/* Left Sidebar Navigation */}
 <aside className="w-64 bg-card dark:bg-dark-card border-r border-border dark:border-dark-border flex flex-col flex-shrink-0 z-20 shadow-lg relative print:hidden transition-colors duration-300">
 <div className="p-4 border-b border-border dark:border-dark-border bg-secondary dark:bg-dark-secondary transition-colors duration-300">
 <div className="flex items-center justify-start">
 <img src="/logo.png" alt="Forensic AI Logo" className="w-12 h-12 object-contain" />
 </div>
 </div>

 <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
 <button
 onClick={() => onTabChange('upload')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'upload' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted dark:text-dark-muted hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white border border-transparent'}`}
 >
 <FaImage size={18} /> <span>Upload Source</span>
 </button>
 <button
 onClick={() => onTabChange('camera')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'camera' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted dark:text-dark-muted hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white border border-transparent'}`}
 >
 <FaCamera size={18} /> <span>Live Capture</span>
 </button>
 <button
 onClick={() => onTabChange('history')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted dark:text-dark-muted hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white border border-transparent'}`}
 >
 <FaHistory size={18} /> <span>Case History</span>
 </button>

 {/* Strict Role Based Access Control */}
 {['super_admin', 'manager', 'auditor'].includes(user?.role) && (
 <div className="pt-6 mt-6 border-t border-border dark:border-dark-border">
 <p className="px-4 text-[10px] font-bold text-muted dark:text-dark-muted uppercase tracking-widest mb-3 flex items-center">
 <FaUserShield className="mr-1.5" /> Administration
 </p>
 <button
 onClick={() => onTabChange('admin')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all shadow-sm border ${activeTab === 'admin' ? 'bg-primary text-white border-red-900 shadow-red-900/20' : 'bg-secondary dark:bg-dark-secondary text-text dark:text-dark-text border-border dark:border-dark-border hover:bg-primary'}`}
 >
 <FaUserShield size={18} /> <span>Admin Panel</span>
 </button>
 </div>
 )}

 {/* Doctor/Medical Examiner Dashboard */}
 {user?.role === 'medical_examiner' && (
 <div className="pt-6 mt-6 border-t border-border dark:border-dark-border">
 <p className="px-4 text-[10px] font-bold text-muted dark:text-dark-muted uppercase tracking-widest mb-3 flex items-center">
 <FaStethoscope className="mr-1.5" /> Clinical
 </p>
 <button
 onClick={() => onTabChange('doctor')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all shadow-sm border ${activeTab === 'doctor' ? 'bg-primary text-white border-red-900 shadow-red-900/20' : 'bg-secondary dark:bg-dark-secondary text-text dark:text-dark-text border-border dark:border-dark-border hover:bg-primary hover:text-white'}`}
 >
 <FaStethoscope size={18} /> <span>Clinical Dashboard</span>
 </button>
 </div>
 )}
 </nav>

 <div className="p-4 border-t border-border dark:border-dark-border bg-secondary dark:bg-dark-secondary transition-colors duration-300">
 <div
 onClick={() => onTabChange('profile')}
 className="flex items-center space-x-3 mb-4 px-2 cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-800 p-2 rounded-xl transition-colors group"
 >
 <div className="w-10 h-10 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center font-bold shadow-inner border border-red-800 group-hover:bg-primary-hover transition-colors">
 {user?.photo ? (
 <img src={user.photo} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 user?.username?.[0]?.toUpperCase() || 'U'
 )}
 </div>
 <div className="overflow-hidden flex-1">
 <p className="text-sm font-bold text-text dark:text-dark-text truncate group-hover:text-white transition-colors">{user?.name || user?.username || 'Analyst'}</p>
 <p className="text-[10px] text-muted dark:text-dark-muted font-bold uppercase tracking-wider truncate mt-0.5">{user?.role?.replace('_', ' ') || 'Personnel'}</p>
 </div>
 </div>
 <button
 onClick={logout}
 className="w-full flex items-center justify-center space-x-2 text-muted dark:text-dark-muted hover:text-red-400 transition-colors font-semibold bg-card dark:bg-dark-card border border-border dark:border-dark-border hover:border-red-900/50 hover:bg-red-900/20 shadow-sm px-4 py-2.5 rounded-xl group"
 >
 <FaSignOutAlt className="group-hover:scale-110 transition-transform" />
 <span>Secure Logout</span>
 </button>
 </div>
 </aside>

 {/* Main Content Workspace */}
 <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-background dark:bg-dark-background transition-colors duration-300">

 {/* Dynamic Context Header */}
 <header className="bg-secondary/80 dark:bg-dark-secondary/80 backdrop-blur-md border-b border-border dark:border-dark-border px-10 py-6 flex justify-between items-end z-10 sticky top-0 shadow-lg shrink-0 print:hidden transition-colors duration-300">
 <div>
 <h2 className="text-2xl font-black text-text dark:text-dark-text tracking-tight flex items-center">
 {activeTab === 'upload' && <><FaImage className="text-primary mr-3" /> Upload Forensic Source</>}
 {activeTab === 'camera' && <><FaCamera className="text-primary mr-3" /> Real-time Wound Capture</>}
 {activeTab === 'history' && <><FaHistory className="text-primary mr-3" /> Past Analysis Records</>}
 {activeTab === 'admin' && <><FaUserShield className="text-accent mr-3" /> System Administration</>}
 {activeTab === 'doctor' && <><FaStethoscope className="text-primary mr-3" /> Clinical Dashboard</>}
 {activeTab === 'profile' && <><FaIdCard className="text-primary mr-3" /> Personnel Profile</>}
 </h2>
 <p className="text-sm font-medium text-muted dark:text-dark-muted mt-1.5 ml-9">
 {activeTab === 'upload' && 'Analyze stationary image files for tool marks and weapon class patterns.'}
 {activeTab === 'camera' && 'Use attached webcam or diagnostic tool for live clinical input.'}
 {activeTab === 'history' && 'Review securely stored past case analysis logs and confidence intervals.'}
 {activeTab === 'admin' && 'Manage analyst identities, generate secure access credentials.'}
 {activeTab === 'doctor' && 'Review cases and append official clinical observations to reports.'}
 {activeTab === 'profile' && 'View your secure credentials and registered contact information.'}
 </p>
 </div>
 <div className="flex items-center space-x-4">
 <button
 onClick={toggleTheme}
 className="bg-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 text-text dark:text-dark-text p-2.5 rounded-full transition-colors font-bold shadow-sm border border-border dark:border-dark-border flex items-center justify-center"
 title="Toggle Dark Mode"
 >
 {isDarkMode ? '🌙' : '☀️'}
 </button>
 </div>
 </header>

 {/* Workspace Content */}
 <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
 <div className="max-w-6xl mx-auto w-full h-full pb-10">

 {showReport && analysisResult ? (
 <div className="relative">
 <button
 onClick={() => setShowReport(false)}
 className="absolute -top-6 right-0 bg-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 text-text dark:text-dark-text font-bold py-2 px-4 rounded shadow transition z-50 print:hidden border border-border dark:border-dark-border"
 >
 Back to Dashboard
 </button>
 <ReportGenerator analysisData={analysisResult} user={user} />
 </div>
 ) : (
 <>
 {/* Administrator Only View */}
 {activeTab === 'admin' && ['super_admin', 'manager', 'auditor'].includes(user?.role) && (
 <AdminDashboard />
 )}

 {/* Doctor Only View */}
 {activeTab === 'doctor' && user?.role === 'medical_examiner' && (
 <DoctorDashboard />
 )}

 {/* Profile View */}
 {activeTab === 'profile' && user && (
 <div className="glass-panel rounded-2xl p-8 bg-card dark:bg-dark-card shadow-lg border border-border dark:border-dark-border relative">
 <h2 className="text-lg font-bold text-text dark:text-dark-text mb-6 flex items-center border-b border-border dark:border-dark-border pb-4">
 <FaIdCard className="text-primary mr-3" /> Identity Matrix
 </h2>

 {!isEditingProfile ? (
 <button
 onClick={startEditingProfile}
 className="absolute top-8 right-8 text-text dark:text-dark-text bg-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors border border-border dark:border-dark-border"
 >
 <FaEdit className="mr-2" /> Edit Profile
 </button>
 ) : (
 <div className="absolute top-8 right-8 flex space-x-2">
 <button
 onClick={() => setIsEditingProfile(false)}
 className="text-muted dark:text-dark-muted bg-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors disabled:opacity-50 border border-border dark:border-dark-border"
 disabled={isSavingProfile}
 >
 <FaTimes className="mr-2" /> Cancel
 </button>
 <button
 onClick={handleSaveProfile}
 className="text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors disabled:opacity-50"
 disabled={isSavingProfile}
 >
 {isSavingProfile ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div> : <FaSave className="mr-2" />}
 Save Changes
 </button>
 </div>
 )}

 <div className="flex flex-col md:flex-row gap-10 items-start mt-4">
 {/* Left side portrait / status */}
 <div className="flex flex-col items-center space-y-4 md:w-1/3 w-full">
 <div className="relative group">
 <div className="w-32 h-32 rounded-full overflow-hidden bg-secondary dark:bg-dark-secondary border-4 border-border dark:border-dark-border flex items-center justify-center text-muted dark:text-dark-muted text-5xl font-bold shadow-inner relative z-10">
 {isEditingProfile && editProfileForm.photo ? (
 <img src={editProfileForm.photo} alt="Avatar" className="w-full h-full object-cover" />
 ) : !isEditingProfile && user.photo ? (
 <img src={user.photo} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 user.username?.[0]?.toUpperCase()
 )}
 {!isEditingProfile && (
 <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
 )}
 </div>
 {isEditingProfile && (
 <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20">
 <FaCamera className="text-xl mb-1" />
 <span className="text-[10px] font-bold">CHANGE</span>
 <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
 </label>
 )}
 </div>
 <div className="text-center w-full px-4">
 {isEditingProfile ? (
 <input
 type="text"
 value={editProfileForm.name}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
 className="w-full text-center bg-white dark:bg-gray-900 dark:border-gray-700 border border-gray-700 shadow-sm ring-2 ring-red-900 text-2xl font-black text-slate-800 dark:text-gray-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-gray-700 mb-1"
 placeholder="Your Display Name"
 />
 ) : (
 <h3 className="text-2xl font-black text-slate-800 dark:text-gray-200">{user.name || user.username}</h3>
 )}
 <p className="text-gray-300 font-bold text-xs tracking-widest uppercase mt-1">{user.role?.replace('_', ' ')}</p>
 <div className="mt-3 inline-flex items-center px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-[10px] font-bold text-green-700 uppercase tracking-widest shadow-sm">
 <FaCheckCircle className="mr-1.5" /> Fully Verified
 </div>
 </div>
 </div>

 {/* Right side details grid */}
 <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="bg-slate-50 border border-slate-200 dark:border-gray-700 rounded-xl p-5 hover:border-gray-700 transition-colors">
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaIdCard />
 <span className="text-xs font-bold uppercase tracking-widest">System Identifier</span>
 </div>
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200">{user.username}</p>
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaEnvelope />
 <span className="text-xs font-bold uppercase tracking-widest">Registered Email</span>
 </div>
 {isEditingProfile ? (
 <input
 type="email"
 value={editProfileForm.email}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700"
 placeholder="analyst@example.com"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200 truncate">{user.email || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaPhone />
 <span className="text-xs font-bold uppercase tracking-widest">Contact Number</span>
 </div>
 {isEditingProfile ? (
 <input
 type="tel"
 value={editProfileForm.phone}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700"
 placeholder="+1 (555) 000-0000"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200">{user.phone || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaClock />
 <span className="text-xs font-bold uppercase tracking-widest">Date of Birth</span>
 </div>
 {isEditingProfile ? (
 <input
 type="date"
 value={editProfileForm.dob}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, dob: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200">
 {user.dob ? new Date(user.dob).toLocaleDateString() : 'Not Provided'}
 </p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaClock />
 <span className="text-xs font-bold uppercase tracking-widest">Age</span>
 </div>
 {isEditingProfile ? (
 <input
 type="number"
 value={editProfileForm.age}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, age: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700"
 placeholder="Age"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200">
 {user.age ? `${user.age} yrs` : 'Not Provided'}
 </p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaUser />
 <span className="text-xs font-bold uppercase tracking-widest">Gender</span>
 </div>
 {isEditingProfile ? (
 <select
 value={editProfileForm.gender}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, gender: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700"
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 <option value="Prefer not to say">Prefer not to say</option>
 </select>
 ) : (
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200">
 {user.gender || 'Not Provided'}
 </p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaGraduationCap />
 <span className="text-xs font-bold uppercase tracking-widest">Highest Education</span>
 </div>
 {isEditingProfile ? (
 <input
 type="text"
 value={editProfileForm.education}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, education: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700"
 placeholder="e.g. M.Sc. Forensic Science"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 dark:text-gray-200 truncate">{user.education || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaFileAlt />
 <span className="text-xs font-bold uppercase tracking-widest">Short Bio / Expertise</span>
 </div>
 {isEditingProfile ? (
 <textarea
 value={editProfileForm.bio}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
 className="w-full bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 font-medium focus:outline-none focus:border-gray-700 resize-none"
 placeholder="Your professional biography and specializations..."
 rows="3"
 ></textarea>
 ) : (
 <p className="text-sm font-medium text-slate-700 dark:text-gray-300 leading-relaxed">{user.bio || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 dark:border-gray-700 hover:border-gray-700'} rounded-xl p-5 transition-all md:col-span-2`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaUserShield />
 <span className="text-xs font-bold uppercase tracking-widest">Biometric Authentication</span>
 </div>
 {isEditingProfile ? (
 <label className="flex items-center space-x-3 text-sm text-slate-700 dark:text-gray-300 mt-2 bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-200 dark:border-gray-700 p-3 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-auto md:inline-flex relative">
 <input
 type="checkbox"
 checked={editProfileForm.biometric_enabled || (editProfileForm.face_data && editProfileForm.face_data.length > 0)}
 onChange={handleBiometricToggle}
 className="rounded border-slate-300 dark:border-gray-600 text-gray-300 focus:ring-red-900 w-5 h-5 shadow-sm"
 />
 <span className="font-bold cursor-pointer">Re-register Facial Login</span>
 {editProfileForm.face_data && editProfileForm.face_data.length > 0 && (
 <span className="ml-2 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider absolute right-2">Face Data Pending</span>
 )}
 </label>
 ) : (
 <div className="mt-2 text-sm">
 {user.biometric_enabled ? (
 <span className="inline-flex items-center text-gray-300 border border-gray-700 bg-gray-800 px-3 py-1.5 rounded-lg font-bold shadow-sm">
 <FaCheckCircle className="mr-2" /> Facial Login Active
 </span>
 ) : (
 <span className="inline-flex items-center text-slate-500 border border-slate-200 dark:border-gray-700 bg-slate-50 px-3 py-1.5 rounded-lg font-bold">
 <FaTimes className="mr-2" /> Facial Login Disabled
 </span>
 )}
 </div>
 )}
 </div>

 </div>
 </div>
 </div>
 )}

 {/* History View */}
 {activeTab === 'history' && (
 <div className="glass-panel rounded-2xl p-8 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm border border-slate-200 dark:border-gray-700 ">
 <h2 className="text-lg font-bold text-slate-800 dark:text-gray-200 mb-6 flex items-center border-b border-slate-100 pb-4">
 <FaHistory className="text-gray-300 mr-3" /> Activity Log
 </h2>
 <div className="space-y-4">
 {history.length === 0 ? (
 <p className="text-slate-500 text-center py-10 bg-slate-50 rounded-xl border border-slate-200 dark:border-gray-700 font-medium">No previous records found in the database.</p>
 ) : (
 history.map(record => (
 <div key={record.id} className="border border-slate-100 p-5 rounded-xl hover:shadow-md transition-all dark:hover:border-gray-700 bg-white dark:bg-gray-900 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center group">
 <div>
 <div className="flex items-center space-x-3 mb-1.5">
 <span className="font-extrabold text-slate-800 dark:text-gray-200 text-lg group-hover:text-gray-300 dark:group-hover:text-gray-300 transition-colors">{record.predicted_weapon}</span>
 <span className="text-xs bg-gray-800 /50 text-gray-300 border border-gray-700 dark:border-gray-700 px-3 py-1 rounded-full font-bold shadow-sm">{record.predicted_wound_type}</span>
 </div>
 <p className="text-xs font-semibold text-slate-400 flex items-center"><FaHistory className="mr-1.5 opacity-50" /> {new Date(record.timestamp).toLocaleString()}</p>
 </div>
 <div className="mt-4 md:mt-0 flex flex-row space-x-8 text-sm bg-slate-50 /50 p-3 rounded-xl border border-slate-100 group-hover:bg-gray-800/50 dark:group-hover:bg-slate-800 transition-colors">
 <div className="text-right">
 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Weapon Match</p>
 <p className={`font-black mt-0.5 text-lg ${record.weapon_probability > 0.85 ? 'text-emerald-500' : 'text-amber-500'}`}>
 {(record.weapon_probability * 100).toFixed(1)}%
 </p>
 </div>
 <div className="text-right">
 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Wound Match</p>
 <p className="font-black text-gray-300 mt-0.5 text-lg">
 {(record.wound_probability * 100).toFixed(1)}%
 </p>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* Analysis Views (Upload or Camera) */}
 {(activeTab === 'upload' || activeTab === 'camera') && (
 <div className="space-y-6">
 <div className="print:hidden">
 <Precautions />
 </div>
 <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start h-full">

 {/* Left Output: Controls */}
 <div className="xl:col-span-7 space-y-6 flex flex-col">
 <div className="glass-panel rounded-2xl p-8 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm border border-slate-200 dark:border-gray-700 flex-1">
 <h3 className="text-lg font-bold text-slate-800 dark:text-gray-200 mb-6 flex items-center border-b border-slate-100 pb-4">
 {activeTab === 'upload' ? <><FaUpload className="text-gray-300 mr-3" /> Digital Image Protocol</> : <><FaCamera className="text-gray-300 mr-3" /> Live Camera Protocol</>}
 </h3>

 {activeTab === 'upload' && (
 <div className="space-y-6">
 <div className="upload-zone rounded-2xl border-dashed border-2 border-slate-300 dark:border-gray-600 hover:border-gray-700 dark:hover:border-gray-700 bg-slate-50 /50 hover:bg-gray-800 dark:hover:bg-slate-700 transition-colors p-12 text-center relative cursor-pointer group" onClick={() => document.getElementById('file-upload').click()}>
 <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
 <div className="w-16 h-16 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
 <FaImage className="text-2xl text-gray-300" />
 </div>
 <p className="text-slate-700 dark:text-gray-300 font-bold text-lg">Select secure file to upload</p>
 <p className="text-slate-500 text-sm mt-2 font-medium">Supports JPG, PNG formats up to 10MB.</p>
 </div>

 {previewUrl && (
 <div className="mt-8 animate-in fade-in zoom-in duration-300">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-slate-700 dark:text-gray-300 text-sm flex items-center">
 <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> Source Preview Active
 </h3>
 <button
 className={`primary-btn px-6 py-2.5 rounded-xl flex items-center space-x-2 font-bold shadow-md transition-all ${loading ? 'opacity-70 cursor-not-allowed bg-gray-800' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
 onClick={handleAnalyze}
 disabled={loading}
 >
 {loading && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>}
 <span>{loading ? 'Executing AI...' : 'Run Forensic Analysis'}</span>
 </button>
 </div>
 <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-gray-700 aspect-video flex items-center justify-center shadow-inner group">
 <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
 <div className="absolute inset-0 bg-gray-800/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'camera' && (
 <div className="space-y-8 flex flex-col items-center">
 <div className="bg-slate-900 w-full rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-300 dark:border-gray-600 shadow-inner">
 <Webcam
 audio={false}
 ref={webcamRef}
 screenshotFormat="image/jpeg"
 videoConstraints={{ width: 1280, height: 720, facingMode: "environment" }}
 className="w-full h-full object-cover"
 />
 <div className="absolute top-4 left-4 bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-md animate-pulse">
 <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900 dark:border-gray-700 mr-2"></div> LIVE FEED REC
 </div>
 </div>
 <div className="flex justify-center w-full">
 <button
 onClick={capture}
 className="flex flex-col items-center group relative w-full max-w-[200px]"
 >
 <div className="w-20 h-20 rounded-full border-[6px] border-slate-200 dark:border-gray-700 flex items-center justify-center mb-3 group-hover:border-gray-700 group-hover:shadow-blue-200 transition-all bg-white dark:bg-gray-900 dark:border-gray-700 shadow-lg relative z-10">
 <div className="w-14 h-14 bg-red-500 rounded-full group-hover:bg-red-600 group-hover:scale-95 transition-all shadow-inner"></div>
 </div>
 <span className="text-sm font-bold text-slate-500 group-hover:text-gray-300 uppercase tracking-widest relative z-10 transition-colors">Capture Frame</span>
 </button>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Right Output: Results */}
 <div className="xl:col-span-5 h-full">
 <div className="glass-panel rounded-2xl p-8 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col relative overflow-hidden">
 <h2 className="text-lg font-bold text-slate-800 dark:text-gray-200 mb-6 flex items-center pb-4 border-b border-slate-100 ">
 <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mr-3 shadow-sm">
 <FaCheckCircle />
 </div>
 Analysis Report Output
 </h2>

 {!analysisResult && !loading ? (
 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-6 px-6 pb-12">
 <div className="w-28 h-28 bg-slate-50 /50 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-inner">
 <FaBiohazard className="text-5xl text-slate-300 opacity-50" />
 </div>
 <p className="text-center text-sm font-medium leading-relaxed max-w-[250px] ">Awaiting input source for algorithmic analysis pipeline. Results will appear here.</p>
 </div>
 ) : loading ? (
 <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-8 pb-12">
 <div className="relative w-24 h-24">
 <div className="absolute inset-0 border-4 border-gray-700 rounded-full shadow-inner"></div>
 <div className="absolute inset-0 border-4 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
 </div>
 <div className="text-center">
 <p className="font-black text-gray-300 text-xl mb-2 animate-pulse tracking-tight">Running Ensembles...</p>
 <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">Extracting Features</p>
 </div>
 </div>
 ) : (
 <div className="space-y-6 flex-1 flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pr-2 pb-2">
 {/* Stats Grid */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
 <div className="absolute top-0 right-0 w-24 h-24 bg-gray-800 /20 rounded-bl-[100px] -z-0"></div>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 z-10 relative">Matching Weapon</p>
 <p className="text-2xl font-black text-slate-800 dark:text-gray-200 mb-4 z-10 relative tracking-tight">{analysisResult.weapon}</p>
 <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
 <div className="bg-gray-800 h-2 rounded-full" style={{ width: `${analysisResult.weapon_probability * 100}%` }}></div>
 </div>
 <div className="flex justify-between text-xs font-bold">
 <span className="text-slate-400 ">Confidence</span>
 <span className="text-gray-300 ">{(analysisResult.weapon_probability * 100).toFixed(1)}%</span>
 </div>
 </div>

 <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
 <div className="absolute top-0 right-0 w-24 h-24 bg-gray-800 /20 rounded-bl-[100px] -z-0"></div>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 z-10 relative">Wound Topology</p>
 <p className="text-2xl font-black text-slate-800 dark:text-gray-200 mb-4 z-10 relative tracking-tight">{analysisResult.wound_type}</p>
 <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
 <div className="bg-gray-800 h-2 rounded-full" style={{ width: `${analysisResult.wound_probability * 100}%` }}></div>
 </div>
 <div className="flex justify-between text-xs font-bold">
 <span className="text-slate-400 ">Confidence</span>
 <span className="text-gray-300 ">{(analysisResult.wound_probability * 100).toFixed(1)}%</span>
 </div>
 </div>
 </div>

 {/* Low Confidence Rejection Block */}
 {analysisResult.requires_manual_review && (
 <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm my-2">
 <div className="flex items-center">
 <FaExclamationTriangle className="text-red-500 mr-3 text-lg" />
 <div>
 <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest">Manual Review Required</p>
 <p className="text-sm text-red-700 dark:text-red-300 font-medium">Confidence threshold unmet. An expert forensic analyst must formally review this visual evidence.</p>
 </div>
 </div>
 </div>
 )}

 {/* Top 3 Alternative Predictions */}
 {(analysisResult.top_3_weapon_alternatives?.length > 0 || analysisResult.top_3_wound_alternatives?.length > 0) && (
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-slate-50 /50 rounded-xl p-4 border border-slate-200 dark:border-gray-700 ">
 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Weapon Candidates</h4>
 <div className="space-y-2">
 {analysisResult.top_3_weapon_alternatives?.map((item, idx) => (
 <div key={'wp' + idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0 last:pb-0">
 <span className="font-semibold text-slate-700 dark:text-gray-300 ">{item.weapon}</span>
 <span className="font-mono text-slate-500 text-xs bg-white dark:bg-gray-900 dark:border-gray-700 px-2 py-0.5 rounded shadow-sm">{(item.confidence * 100).toFixed(1)}%</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-slate-50 /50 rounded-xl p-4 border border-slate-200 dark:border-gray-700 ">
 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Wound Candidates</h4>
 <div className="space-y-2">
 {analysisResult.top_3_wound_alternatives?.map((item, idx) => (
 <div key={'wd' + idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0 last:pb-0">
 <span className="font-semibold text-slate-700 dark:text-gray-300 ">{item.wound_type}</span>
 <span className="font-mono text-slate-500 text-xs bg-white dark:bg-gray-900 dark:border-gray-700 px-2 py-0.5 rounded shadow-sm">{(item.confidence * 100).toFixed(1)}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Grad-CAM Map */}
 <div className="min-h-[220px] h-[220px] pb-4 shrink-0">
 <h3 className="text-[10px] font-bold text-slate-400 mb-3 flex items-center uppercase tracking-widest">
 Activation Map Overlay
 </h3>
 <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-gray-700 h-[220px] group shadow-inner">
 {previewUrl ? (
 <>
 <img src={previewUrl} className="w-full h-full object-cover opacity-60 mix-blend-screen" alt="Grad-CAM" />
 <div className="absolute inset-0 bg-gray-800/40 mix-blend-overlay"></div>
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/60 via-red-500/40 to-transparent mix-blend-hard-light"></div>
 <div className="absolute bottom-3 left-3 bg-white dark:bg-gray-900 dark:border-gray-700/95 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-gray-200 shadow-md backdrop-blur-sm flex items-center">
 <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2 animate-pulse shadow-sm"></div> High Activation Array
 </div>
 </>
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
 <FaImage className="text-3xl opacity-50 mb-2" />
 <span className="text-xs font-medium">No source data</span>
 </div>
 )}
 </div>
 </div>

 {/* Details & Precautions */}
 {analysisResult.severity && (
 <div className="bg-slate-50 /50 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 shadow-sm space-y-4 shrink-0">
 <div>
 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
 <FaBiohazard className="mr-2 text-red-400" /> Assessment Details
 </h4>
 <div className="flex gap-2 items-center text-sm mb-3">
 <span className="font-semibold text-slate-700 dark:text-gray-300 ">Severity Level:</span>
 <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${(analysisResult.severity === 'Critical' || analysisResult.severity === 'Severe') ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'}`}>
 {analysisResult.severity}
 </span>
 </div>
 <div>
 <span className="font-semibold text-slate-700 dark:text-gray-300 text-sm">Forensic Notes:</span>
 <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-1">
 {analysisResult.forensic_notes?.map((note, idx) => <li key={idx} className="leading-relaxed">{note}</li>)}
 </ul>
 </div>
 </div>

 <div className="pt-3 border-t border-slate-200 dark:border-gray-700">
 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
 <FaExclamationTriangle className="mr-2 text-amber-500" /> Required Precautions
 </h4>
 <ul className="space-y-2">
 {analysisResult.precautions?.map((prec, idx) => (
 <li key={idx} className="flex items-start text-sm text-slate-700 dark:text-gray-300 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 shadow-sm leading-relaxed">
 <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2.5 shrink-0"></div>
 {prec}
 </li>
 ))}
 </ul>
 </div>

 <div className="mt-6 flex justify-end space-x-4 print:hidden">
 {analysisResult.pdf_download_url && (
 <button
 onClick={() => handleDownloadPDF(analysisResult.pdf_download_url, analysisResult.record_id)}
 className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow transition"
 >
 <FaFileAlt />
 <span>Download Official PDF</span>
 </button>
 )}
 <button
 onClick={() => setShowReport(true)}
 className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-xl shadow transition"
 >
 <FaIdCard />
 <span>View Browser Report</span>
 </button>
 </div>
 </div>
 )}

 <div className="bg-gradient-to-r from-amber-50 to-orange-50 shrink-0 border-l-4 border-l-amber-500 border-y border-r border-amber-200 rounded-r-xl p-4 mt-auto shadow-sm">
 <div className="flex items-start space-x-3">
 <FaExclamationTriangle className="text-orange-500 mt-0.5 shrink-0 text-lg" />
 <p className="text-xs text-amber-900 font-medium leading-relaxed">
 <span className="font-bold text-orange-700 uppercase tracking-wide">Protocol Warning:</span> Algorithmic outputs require secondary verification. These statistical results alone do not constitute legal forensic proof.
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </div>
 </main>
 </div>
 );
};

export default Dashboard;
