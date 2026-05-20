import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaUserCircle, FaIdCard, FaGraduationCap, FaInfoCircle, FaFileUpload } from 'react-icons/fa';

const ProfileSetup = () => {
 const { user, login } = useAuth();
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 const [formData, setFormData] = useState({
 password: '',
 confirmPassword: '',
 photo: '',
 education: '',
 bio: '',
 dob: '',
 gender: 'Prefer not to say',
 idType: 'Aadhaar'
 });
 const [idFile, setIdFile] = useState(null);

 const isRecovery = !!user?.dob || !!user?.education || !!user?.bio;

 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (formData.password !== formData.confirmPassword) {
 return setError('Passwords do not match');
 }
 if (formData.password.length < 8) {
 return setError('Password must be at least 8 characters long');
 }
 if (!isRecovery && !idFile) {
 return setError('Please upload an ID document for verification.');
 }

 setLoading(true);
 setError('');

 try {
 const token = localStorage.getItem('token');
 const payload = { password: formData.password };

 if (!isRecovery) {
 payload.photo = formData.photo || 'default_avatar.png';
 payload.education = formData.education;
 payload.bio = formData.bio;
 payload.dob = formData.dob;
 payload.gender = formData.gender;
 }

 await axios.post('http://localhost:8000/api/profile/setup', payload, {
 headers: { Authorization: `Bearer ${token}` }
 });

 if (!isRecovery && idFile) {
 const idFormData = new FormData();
 idFormData.append('document_type', formData.idType);
 idFormData.append('file', idFile);
 await axios.post('http://localhost:8000/api/id-verification/upload', idFormData, {
 headers: {
 'Content-Type': 'multipart/form-data',
 Authorization: `Bearer ${token}`
 }
 });
 }

 // Update local user state
 const updatedUser = { ...user, is_profile_complete: true };
 login(updatedUser, token);
 navigate('/');
 } catch (err) {
 setError(err.response?.data?.detail || 'Failed to complete profile setup');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-background dark:bg-dark-background flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
 {/* Decorative background elements */}
 <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

 <div className="glass-panel p-8 md:p-10 rounded-2xl w-full max-w-2xl z-10 shadow-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card">
 <div className="mb-8 text-center border-b border-border dark:border-dark-border pb-6">
 <div className="mx-auto bg-secondary dark:bg-dark-secondary w-16 h-16 flex items-center justify-center rounded-full text-primary mb-4">
 <FaIdCard size={32} />
 </div>
 <h1 className="text-2xl font-bold text-text dark:text-dark-text tracking-tight">
 {isRecovery ? 'Secure Password Recovery' : 'Complete Your Profile'}
 </h1>
 <p className="text-muted dark:text-dark-muted mt-2 text-sm">
 Welcome{isRecovery ? ' back' : ''}, <span className="font-semibold text-text dark:text-dark-text">{user?.name}</span>.
 {isRecovery ? ' Please set a new secure password for your account to regain access.' : ' Please set up your credentials and personal details before accessing the system.'}
 </p>
 </div>

 {error && (
 <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm font-medium rounded-r">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className={`grid grid-cols-1 ${!isRecovery ? 'md:grid-cols-2 gap-6' : ''} relative`}>

 {/* Security Section */}
 <div className={`space-y-4 ${!isRecovery ? 'md:border-r border-border dark:border-dark-border md:pr-6' : ''}`}>
 <h3 className="text-sm font-bold text-text dark:text-dark-text uppercase tracking-wider flex items-center mb-4"><FaUserCircle className="mr-2" /> Security</h3>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Set New Password</label>
 <input
 type="password" name="password" required value={formData.password} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="Minimum 8 characters"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Confirm Password</label>
 <input
 type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="Repeat password"
 />
 </div>
 </div>

 {/* Personal Details Section */}
 {!isRecovery && (
 <div className="space-y-4 md:pl-2">
 <h3 className="text-sm font-bold text-text dark:text-dark-text uppercase tracking-wider flex items-center mb-4"><FaInfoCircle className="mr-2" /> Personal Details</h3>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Date of Birth</label>
 <input
 type="date" name="dob" required value={formData.dob} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Gender</label>
 <select
 name="gender" value={formData.gender} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 <option value="Prefer not to say">Prefer not to say</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1 flex items-center"><FaGraduationCap className="mr-1" /> Highest Education</label>
 <input
 type="text" name="education" required value={formData.education} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="e.g. M.Sc. Forensic Science"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Short Bio / Expertise</label>
 <textarea
 name="bio" rows="2" required value={formData.bio} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none placeholder-muted"
 placeholder="Brief description of your role..."
 ></textarea>
 </div>

 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Photo URL (Optional)</label>
 <input
 type="text" name="photo" value={formData.photo} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted"
 placeholder="https://..."
 />
 </div>

 </div>
 )}
 </div>

 {!isRecovery && (
 <div className="border-t border-border dark:border-dark-border pt-6 mt-6 pb-2">
 <h3 className="text-sm font-bold text-text dark:text-dark-text uppercase tracking-wider flex items-center mb-4"><FaIdCard className="mr-2" /> Mandatory ID Verification</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Document Type</label>
 <select
 name="idType" value={formData.idType} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-text dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary outline-none"
 >
 <option value="Aadhaar">Aadhaar Card</option>
 <option value="Passport">Passport</option>
 <option value="Driving License">Driving License</option>
 <option value="Other">Other Official ID</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-text dark:text-dark-text mb-1">Upload Document Image</label>
 <div className="relative">
 <input
 type="file"
 accept="image/*,.pdf"
 onChange={(e) => setIdFile(e.target.files[0])}
 className="hidden"
 id="id-upload"
 />
 <label htmlFor="id-upload" className="w-full flex items-center px-3 py-2 text-sm rounded-lg border border-dashed border-primary/50 hover:border-primary bg-primary/5 text-text dark:text-dark-text cursor-pointer transition-colors">
 <FaFileUpload className="mr-2 text-primary" />
 {idFile ? idFile.name : 'Choose File to Upload'}
 </label>
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="border-t border-border dark:border-dark-border mt-2">
 <button
 type="submit"
 disabled={loading}
 className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all shadow-md ${loading ? 'bg-red-800 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover hover:shadow-lg focus:ring-4 focus:ring-red-900/50'}`}
 >
 {loading ? 'Saving Profile...' : isRecovery ? 'Update Password & Login' : 'Complete Setup & Access System'}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

export default ProfileSetup;
