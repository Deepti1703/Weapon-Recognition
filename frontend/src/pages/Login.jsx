import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaShieldAlt, FaKey, FaArrowLeft, FaCheckCircle, FaCamera, FaUserPlus, FaUser, FaLock, FaEnvelope, FaPhone, FaIdBadge } from 'react-icons/fa';
import BiometricAuth from '../components/BiometricAuth';

const Login = () => {
 const { login } = useAuth();
 const navigate = useNavigate();
 const toast = useToast();

 const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
 const [loading, setLoading] = useState(false);

 // Login State
 const [loginUsername, setLoginUsername] = useState('');
 const [loginPassword, setLoginPassword] = useState('');
 const [isRecoveryMode, setIsRecoveryMode] = useState(false);
 const [recoveryEmail, setRecoveryEmail] = useState('');
 const [recoverySuccess, setRecoverySuccess] = useState(null);
 const [showBiometric, setShowBiometric] = useState(false);

 // Register State
 const [regStep, setRegStep] = useState(1); // 1: Details, 2: OTP
 const [regData, setRegData] = useState({
 name: '', email: '', phone: '', id_proof: '',
 username: '', password: '', confirmPassword: ''
 });
 const [otpData, setOtpData] = useState({ email_otp: '', phone_otp: '' });
 const [faceData, setFaceData] = useState(null);
 const [showRegBiometric, setShowRegBiometric] = useState(false);

 useEffect(() => {
 setLoginUsername(''); setLoginPassword('');
 }, [activeTab]);

 const handleLogin = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 const response = await axios.post('http://127.0.0.1:8000/api/login', {
 username: loginUsername, password: loginPassword
 });
 const { access_token } = response.data;
 const userResponse = await axios.get('http://127.0.0.1:8000/api/me', {
 headers: { Authorization: `Bearer ${access_token}` }
 });
 login(userResponse.data, access_token);
 if (!userResponse.data.is_profile_complete) navigate('/setup');
 else navigate('/');
 toast.success("Successfully logged in.");
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Invalid credentials or unauthorized access.');
 } finally { setLoading(false); }
 };

 const handleBiometricLogin = async (data) => {
 setLoading(true); setShowBiometric(false);
 try {
 const response = await axios.post('http://127.0.0.1:8000/api/login/biometric', {
 username: data.username,
 face_data: data.face_data || null,
 face_frames: data.face_frames || []
 });
 const { access_token } = response.data;
 const userResponse = await axios.get('http://127.0.0.1:8000/api/me', {
 headers: { Authorization: `Bearer ${access_token}` }
 });
 login(userResponse.data, access_token);
 if (!userResponse.data.is_profile_complete) navigate('/setup');
 else navigate('/');
 toast.success("Biometric authentication successful.");
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Biometric authentication failed.');
 } finally { setLoading(false); }
 };

 const handleRecoverPassword = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 const response = await axios.post('http://127.0.0.1:8000/api/forgot-password', {
 username: loginUsername, email: recoveryEmail
 });
 setRecoverySuccess(response.data.temporary_password);
 toast.success("Identity verified! Recovery passcode generated.");
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Failed to verify identity.');
 } finally { setLoading(false); }
 };

 const handleRegChange = (e) => {
 setRegData({ ...regData, [e.target.name]: e.target.value });
 };

 const handleGenerateOTP = async (e) => {
 e.preventDefault();
 if (regData.password !== regData.confirmPassword) {
 toast.error("Passwords do not match."); return;
 }
 // Minimal password criteria check before sending OTP
 if (regData.password.length < 8) {
 toast.error("Password must be at least 8 characters long."); return;
 }

 setLoading(true);
 try {
 // Trigger Email OTP
 await axios.post('http://127.0.0.1:8000/api/auth/send-otp', { identifier: regData.email });
 // Trigger Phone OTP
 await axios.post('http://127.0.0.1:8000/api/auth/send-otp', { identifier: regData.phone });

 toast.success("OTP sent successfully");
 setRegStep(2);
 } catch (err) {
 toast.error("Failed to generate OTPs. Please try again.");
 } finally { setLoading(false); }
 };

 const handleRegister = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 const response = await axios.post('http://127.0.0.1:8000/api/register', {
 ...regData,
 face_data: faceData,
 role: 'forensic_analyst',
 email_otp: otpData.email_otp,
 phone_otp: otpData.phone_otp
 });
 const { access_token } = response.data;
 const userResponse = await axios.get('http://127.0.0.1:8000/api/me', {
 headers: { Authorization: `Bearer ${access_token}` }
 });
 login(userResponse.data, access_token);
 toast.success("Account created successfully!");
 navigate('/setup');
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Registration failed.');
 } finally { setLoading(false); }
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background dark:from-dark-background dark:via-dark-secondary dark:to-dark-background py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
 <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
 <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

 <div className="glass-panel p-8 sm:p-10 rounded-2xl w-full max-w-lg z-10 transition-all duration-300 border border-border dark:border-dark-border">

 {/* Header Toggle */}
 {!isRecoveryMode && (
 <div className="flex bg-secondary dark:bg-dark-secondary rounded-lg p-1 mb-8 shadow-inner">
 <button
 className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'login' ? 'bg-primary text-white shadow' : 'text-muted dark:text-dark-muted hover:text-text dark:hover:text-dark-text'}`}
 onClick={() => { setActiveTab('login'); setRegStep(1); }}
 >
 Secure Login
 </button>
 <button
 className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'register' ? 'bg-primary text-white shadow' : 'text-muted dark:text-dark-muted hover:text-text dark:hover:text-dark-text'}`}
 onClick={() => { setActiveTab('register'); setIsRecoveryMode(false); }}
 >
 Registration
 </button>
 </div>
 )}

 <div className="text-center mb-6">
 <div className="flex justify-center mb-3 text-primary">
 {isRecoveryMode ? <FaKey size={40} className="text-accent" /> : <FaShieldAlt size={40} />}
 </div>
 <h1 className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">
 {isRecoveryMode ? 'Access Recovery' : activeTab === 'login' ? 'System Login' : 'Analyst Enrollment'}
 </h1>
 </div>

 {isRecoveryMode && recoverySuccess ? (
 <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
 <div className="mx-auto bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-sm border border-green-200">
 <FaCheckCircle size={32} />
 </div>
 <h3 className="text-xl font-bold text-text dark:text-dark-text">Identity Verified</h3>
 <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-lg p-5 mt-4 text-center shadow-inner">
 <span className="text-xs font-bold text-muted dark:text-dark-muted uppercase tracking-wider block mb-2">Temporary Passcode</span>
 <div className="text-2xl font-mono font-bold text-primary tracking-widest select-all">{recoverySuccess}</div>
 </div>
 <button
 onClick={() => { setIsRecoveryMode(false); setRecoverySuccess(null); }}
 className="w-full py-3 mt-4 rounded-lg text-white font-semibold flex items-center justify-center bg-primary hover:bg-primary-hover shadow-md transition-all"
 >
 <FaArrowLeft className="mr-2" /> Return to Secure Login
 </button>
 </div>
 ) : isRecoveryMode ? (
 <form onSubmit={handleRecoverPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300" autoComplete="off">
 <div>
 <label className="block text-sm font-semibold text-text dark:text-dark-text mb-2">Username</label>
 <input type="text" className="w-full px-4 py-3 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary outline-none transition-all placeholder-muted" placeholder="Enter your system ID" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
 </div>
 <div>
 <label className="block text-sm font-semibold text-text dark:text-dark-text mb-2">Registered Email Address</label>
 <input type="email" className="w-full px-4 py-3 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary outline-none transition-all placeholder-muted" placeholder="your@email.com" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} required />
 </div>
 <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg text-white font-semibold transition-all shadow-md ${loading ? 'bg-red-800' : 'bg-primary hover:bg-primary-hover'}`}>
 {loading ? 'Verifying...' : 'Generate Passcode'}
 </button>
 <button type="button" onClick={() => setIsRecoveryMode(false)} className="w-full py-2 text-sm text-muted dark:text-dark-muted font-medium flex items-center justify-center hover:text-text dark:hover:text-dark-text transition-colors">
 <FaArrowLeft className="mr-2" /> Cancel Request
 </button>
 </form>
 ) : activeTab === 'login' ? (
 /* LOGIN TAB */
 <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
 <div>
 <label className="block text-sm font-semibold text-text dark:text-dark-text mb-2">System ID</label>
 <input type="text" className="w-full px-4 py-3 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary outline-none transition-all placeholder-muted" placeholder="Doctor / Admin / Analyst ID" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
 </div>
 <div>
 <div className="flex justify-between items-center mb-2">
 <label className="block text-sm font-semibold text-text dark:text-dark-text">Password</label>
 <button type="button" onClick={() => setIsRecoveryMode(true)} className="text-xs text-primary hover:text-primary-hover font-bold transition-colors">Forgot Password?</button>
 </div>
 <input type="password" className="w-full px-4 py-3 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary outline-none transition-all placeholder-muted" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
 </div>
 <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg text-white font-semibold transition-all shadow-md ${loading ? 'bg-red-800 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover hover:shadow-lg focus:ring-4 focus:ring-red-900/50'}`}>
 {loading ? 'Authenticating...' : 'Secure Login'}
 </button>

 <div className="relative flex items-center py-2">
 <div className="flex-grow border-t border-border dark:border-dark-border"></div>
 <span className="flex-shrink-0 mx-4 text-muted dark:text-dark-muted text-sm">OR</span>
 <div className="flex-grow border-t border-border dark:border-dark-border"></div>
 </div>

 <button type="button" onClick={() => { if (!loginUsername) { toast.error('Please enter your System ID to use Face Login.'); return; } setShowBiometric(true); }} disabled={loading} className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center transition-all border-2 border-border dark:border-dark-border text-text dark:text-dark-text hover:bg-secondary dark:hover:bg-dark-secondary`}>
 <FaCamera className="mr-2" /> Face Login
 </button>
 </form>
 ) : (
 /* REGISTER TAB */
 <div className="animate-in fade-in slide-in-from-right-4 duration-300">
 {regStep === 1 ? (
 <form onSubmit={handleGenerateOTP} className="space-y-4 text-sm">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaUser className="mr-1 text-muted" /> Full Name</label>
 <input type="text" name="name" required value={regData.name} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" />
 </div>
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaIdBadge className="mr-1 text-muted" /> ID Ref.</label>
 <input type="text" name="id_proof" required value={regData.id_proof} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaEnvelope className="mr-1 text-muted" /> Email</label>
 <input type="email" name="email" required value={regData.email} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" />
 </div>
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaPhone className="mr-1 text-muted" /> Phone</label>
 <input type="tel" name="phone" required value={regData.phone} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" />
 </div>
 </div>
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaUser className="mr-1 text-muted" /> System Username</label>
 <input type="text" name="username" required value={regData.username} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaLock className="mr-1 text-muted" /> Password</label>
 <input type="password" name="password" required value={regData.password} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" placeholder="Min 8 chars" />
 </div>
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaLock className="mr-1 text-muted" /> Confirm</label>
 <input type="password" name="confirmPassword" required value={regData.confirmPassword} onChange={handleRegChange} className="w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-1 focus:ring-primary outline-none" />
 </div>
 </div>

 {faceData ? (
 <div className="w-full py-2 px-3 text-xs rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-medium text-center">
 Facial Identity Captured
 </div>
 ) : (
 <button type="button" onClick={() => setShowRegBiometric(true)} className="w-full py-2 text-xs rounded-lg text-text dark:text-dark-text font-semibold bg-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all border border-border dark:border-dark-border">
 <FaCamera className="mr-2 text-primary" /> Optional Face Setup
 </button>
 )}

 <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg text-white font-semibold transition-all mt-4 ${loading ? 'bg-red-800' : 'bg-primary hover:bg-primary-hover shadow-md'}`}>
 {loading ? 'Processing...' : 'Proceed to OTP Verification'}
 </button>
 </form>
 ) : (
 <form onSubmit={handleRegister} className="space-y-4">
 <div className="text-center mb-4">
 <h3 className="font-bold text-text dark:text-dark-text text-lg">Verify Contact Methods</h3>
 <p className="text-xs text-muted dark:text-dark-muted mt-1">Please enter the One-Time Passwords sent to your email and phone number.</p>
 </div>
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-2 text-sm flex items-center"><FaEnvelope className="mr-2 text-muted" /> Email OTP</label>
 <input type="text" required value={otpData.email_otp} onChange={(e) => setOtpData({ ...otpData, email_otp: e.target.value })} className="w-full px-4 py-3 text-lg font-mono tracking-widest text-center rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary outline-none" placeholder="------" maxLength={6} />
 </div>
 <div>
 <label className="block font-semibold text-text dark:text-dark-text mb-2 text-sm flex items-center"><FaPhone className="mr-2 text-muted" /> Phone OTP</label>
 <input type="text" required value={otpData.phone_otp} onChange={(e) => setOtpData({ ...otpData, phone_otp: e.target.value })} className="w-full px-4 py-3 text-lg font-mono tracking-widest text-center rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary outline-none" placeholder="------" maxLength={6} />
 </div>
 <div className="flex gap-3 pt-2">
 <button type="button" onClick={() => setRegStep(1)} className="flex-1 py-3 text-sm rounded-lg font-semibold border-2 border-border dark:border-dark-border text-text dark:text-dark-text hover:bg-secondary dark:hover:bg-dark-secondary transition-all">
 Back
 </button>
 <button type="submit" disabled={loading} className={`flex-[2] py-3 text-sm rounded-lg text-white font-semibold shadow-md transition-all ${loading ? 'bg-red-800' : 'bg-primary hover:bg-primary-hover'}`}>
 {loading ? 'Creating...' : 'Enroll Account'}
 </button>
 </div>
 </form>
 )}
 </div>
 )}
 </div>

 {/* Modals for Face Login / Face Reg */}
 {showBiometric && (
 <BiometricAuth username={loginUsername} onVerify={handleBiometricLogin} onCancel={() => setShowBiometric(false)} />
 )}
 {showRegBiometric && (
 <BiometricAuth username={regData.username || "new_user"} onVerify={(data) => { setFaceData(data.face_data); setShowRegBiometric(false); toast.success("Biometric data saved securely."); }} onCancel={() => setShowRegBiometric(false)} isRegistration={true} />
 )}
 </div>
 );
};

export default Login;
