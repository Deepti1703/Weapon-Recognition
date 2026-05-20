import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaUserPlus, FaCamera, FaIdBadge, FaEnvelope, FaPhone, FaLock, FaUser } from 'react-icons/fa';
import BiometricAuth from '../components/BiometricAuth';
import { useAuth } from '../context/AuthContext';

const Register = () => {
 const [formData, setFormData] = useState({
 name: '',
 email: '',
 phone: '',
 id_proof: '',
 username: '',
 password: '',
 confirmPassword: ''
 });
 const [faceData, setFaceData] = useState(null);
 const [showBiometric, setShowBiometric] = useState(false);
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const navigate = useNavigate();
 const { login } = useAuth();

 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleRegister = async (e) => {
 e.preventDefault();
 setError('');

 if (formData.password !== formData.confirmPassword) {
 setError("Passwords do not match.");
 return;
 }

 setLoading(true);

 try {
 const response = await axios.post('http://127.0.0.1:8000/api/register', {
 name: formData.name,
 email: formData.email,
 phone: formData.phone,
 id_proof: formData.id_proof,
 username: formData.username,
 password: formData.password,
 face_data: faceData,
 role: 'forensic_analyst'
 });

 const { access_token } = response.data;

 // Automatically log them in after registration
 const userResponse = await axios.get('http://127.0.0.1:8000/api/me', {
 headers: { Authorization: `Bearer ${access_token}` }
 });

 login(userResponse.data, access_token);
 navigate('/');
 } catch (err) {
 setError(err.response?.data?.detail || 'An error occurred during registration.');
 } finally {
 setLoading(false);
 }
 };

 const handleCaptureFace = (data) => {
 setFaceData(data.face_data);
 setShowBiometric(false);
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background dark:from-dark-background dark:via-dark-secondary dark:to-dark-background py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
 <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
 <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

 <div className="glass-panel p-8 sm:p-10 rounded-2xl w-full max-w-xl z-10 transition-all duration-300 border border-border dark:border-dark-border">
 <div className="text-center mb-8">
 <div className="flex justify-center mb-4 text-primary">
 <FaUserPlus size={48} />
 </div>
 <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-dark-text tracking-tight">Public Analyst Registration</h1>
 <p className="text-muted dark:text-dark-muted mt-2 text-sm">Create an account to securely capture and analyze weapon forensic evidence.</p>
 </div>

 {error && (
 <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm font-medium rounded-r">
 {error}
 </div>
 )}

 <form onSubmit={handleRegister} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaUser className="mr-1 text-muted" /> Full Legal Name</label>
 <input type="text" name="name" required value={formData.name} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="Dr. John Doe"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaIdBadge className="mr-1 text-muted" /> ID Proof Reference</label>
 <input type="text" name="id_proof" required value={formData.id_proof} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="License/Badge ID"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaEnvelope className="mr-1 text-muted" /> Email Address</label>
 <input type="email" name="email" required value={formData.email} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="personnel@forensics.org"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaPhone className="mr-1 text-muted" /> Phone Number</label>
 <input type="tel" name="phone" required value={formData.phone} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="+1 (555) 000-0000"
 />
 </div>
 </div>

 <div className="border-t border-slate-200 dark:border-gray-700 mt-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaUser className="mr-1 text-muted" /> Desired Username</label>
 <input type="text" name="username" required value={formData.username} onChange={handleChange} autoComplete="off"
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="Unique Service ID"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaLock className="mr-1 text-muted" /> Password</label>
 <input type="password" name="password" required value={formData.password} onChange={handleChange} autoComplete="new-password"
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="••••••••"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaLock className="mr-1 text-muted" /> Confirm Password</label>
 <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password"
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="••••••••"
 />
 </div>
 </div>

 <div className="pt-4">
 <p className="text-xs font-semibold text-text dark:text-dark-text mb-2">Biometric Setup (Recommended)</p>
 {faceData ? (
 <div className="w-full py-3 px-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-medium flex items-center justify-center">
 Facial Identity Captured and Encrypted Successfully.
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setShowBiometric(true)}
 className="w-full py-3 px-4 rounded-lg text-text dark:text-dark-text font-semibold bg-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 border border-border dark:border-dark-border flex items-center justify-center transition-all shadow-sm"
 >
 <FaCamera className="mr-2 text-primary" /> Capture Face ID (Optional)
 </button>
 )}
 </div>

 <button
 type="submit"
 disabled={loading}
 className={`w-full py-3 px-4 mt-6 rounded-lg text-white font-semibold transition-all shadow-md ${loading ? 'bg-red-800 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover hover:shadow-lg focus:ring-4 focus:ring-red-900/50'}`}
 >
 {loading ? 'Registering...' : 'Create Valid Credentials'}
 </button>

 <div className="text-center mt-4">
 <Link to="/login" className="text-sm text-primary hover:text-primary-hover font-bold transition-colors">
 Already have an account? Sign in
 </Link>
 </div>
 </form>
 </div>

 {showBiometric && (
 <BiometricAuth
 username={formData.username}
 onVerify={handleCaptureFace}
 onCancel={() => setShowBiometric(false)}
 isRegistration={true}
 />
 )}
 </div>
 );
};

export default Register;
