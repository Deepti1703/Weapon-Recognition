import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaUserShield, FaUserPlus, FaEnvelope, FaPhone, FaIdBadge, FaCheckCircle, FaClipboardList, FaUsers, FaCheck, FaTimes, FaEdit, FaSave } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const AdminDashboard = () => {
 const { user } = useAuth();
 const toast = useToast();
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(null);
 const [error, setError] = useState('');
 const [usersList, setUsersList] = useState([]);
 const [recycleBinList, setRecycleBinList] = useState([]);
 const [loadingUsers, setLoadingUsers] = useState(true);
 const [loadingRecycle, setLoadingRecycle] = useState(false);
 const [adminTab, setAdminTab] = useState('active'); // 'active', 'recycle', 'records_recycle', 'verifications'
 const [verificationsList, setVerificationsList] = useState([]);
 const [loadingVerifications, setLoadingVerifications] = useState(false);
 const [editingUserId, setEditingUserId] = useState(null);
 const [editUserForm, setEditUserForm] = useState({ name: '', email: '', phone: '', role: '', id_proof: '', age: '', dob: '', gender: '', education: '', bio: '', is_profile_complete: false, biometric_enabled: false });
 const [recycleBinRecords, setRecycleBinRecords] = useState([]);
 const [loadingRecordsRecycle, setLoadingRecordsRecycle] = useState(false);
 const [viewingProfileId, setViewingProfileId] = useState(null);
 const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
 const [isEditingDetails, setIsEditingDetails] = useState(false);

 const [formData, setFormData] = useState({
 name: '',
 email: '',
 phone: '',
 id_proof: '',
 role: 'forensic_analyst'
 });

 const fetchUsers = async () => {
 setLoadingUsers(true);
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get('http://127.0.0.1:8000/api/admin/users', {
 headers: { Authorization: `Bearer ${token}` }
 });
 setUsersList(response.data);
 } catch (err) {
 console.error("Failed to fetch users:", err);
 if (err.response?.status === 401) {
 toast.error("Your session has expired. Please log out and back in.");
 }
 } finally {
 setLoadingUsers(false);
 }
 };

 const fetchRecycleBin = async () => {
 setLoadingRecycle(true);
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get('http://127.0.0.1:8000/api/admin/recycle-bin', {
 headers: { Authorization: `Bearer ${token}` }
 });
 setRecycleBinList(response.data);
 } catch (err) {
 console.error("Failed to fetch recycle bin:", err);
 if (err.response?.status === 401) {
 toast.error("Your session has expired. Please log out and back in.");
 }
 } finally {
 setLoadingRecycle(false);
 }
 };

 const fetchRecordsRecycleBin = async () => {
 setLoadingRecordsRecycle(true);
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get('http://127.0.0.1:8000/api/admin/records/recycle-bin', {
 headers: { Authorization: `Bearer ${token}` }
 });
 setRecycleBinRecords(response.data);
 } catch (err) {
 console.error("Failed to fetch records recycle bin:", err);
 } finally {
 setLoadingRecordsRecycle(false);
 }
 };

 const fetchVerifications = async () => {
 setLoadingVerifications(true);
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get('http://127.0.0.1:8000/api/admin/id-verification', {
 headers: { Authorization: `Bearer ${token}` }
 });
 setVerificationsList(response.data);
 } catch (err) {
 console.error("Failed to fetch verifications:", err);
 toast.error("Failed to load ID verifications.");
 } finally {
 setLoadingVerifications(false);
 }
 };

 const handleVerifyStatus = async (id, status) => {
 try {
 const token = localStorage.getItem('token');
 await axios.post(`http://127.0.0.1:8000/api/admin/id-verification/${id}/${status}`, {}, {
 headers: { Authorization: `Bearer ${token}` }
 });
 toast.success(`ID verification ${status} successfully.`);
 fetchVerifications();
 } catch (err) {
 toast.error(`Failed to ${status} ID verification.`);
 }
 };

 useEffect(() => {
 if (['super_admin', 'manager', 'auditor'].includes(user?.role)) {
 if (adminTab === 'active') fetchUsers();
 if (adminTab === 'recycle') fetchRecycleBin();
 if (adminTab === 'records_recycle') fetchRecordsRecycleBin();
 if (adminTab === 'verifications') fetchVerifications();
 }
 }, [user, adminTab]);

 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 setSuccess(null);

 try {
 const token = localStorage.getItem('token');
 const response = await axios.post('http://127.0.0.1:8000/api/admin/create-user', formData, {
 headers: { Authorization: `Bearer ${token}` }
 });

 setSuccess({
 username: response.data.username,
 password: response.data.temporary_password
 });

 // Reset form
 setFormData({ name: '', email: '', phone: '', id_proof: '', role: 'forensic_analyst' });

 // Refresh list
 fetchUsers();
 } catch (err) {
 console.error(err);
 const msg = err.response?.data?.detail || err.message || JSON.stringify(err);
 setError(`Error [${err.response?.status || 'Network'}]: ${msg}`);
 } finally {
 setLoading(false);
 }
 };

 const handleEditUser = (u) => {
 setEditingUserId(u.id);
 setEditUserForm({
 name: u.name || '',
 email: u.email || '',
 phone: u.phone || '',
 role: u.role || 'forensic_analyst',
 id_proof: u.id_proof || '',
 age: u.age || '',
 dob: u.dob || '',
 gender: u.gender || '',
 education: u.education || '',
 bio: u.bio || '',
 is_profile_complete: u.is_profile_complete || false,
 biometric_enabled: u.biometric_enabled || false
 });
 };

 const handleSaveEditUser = async (e, userId) => {
 e.preventDefault();
 try {
 const token = localStorage.getItem('token');
 const dataToSubmit = { ...editUserForm };
 if (dataToSubmit.age === '') dataToSubmit.age = null;
 if (dataToSubmit.dob === '') dataToSubmit.dob = null;
 await axios.put(`http://127.0.0.1:8000/api/admin/users/${userId}`, dataToSubmit, {
 headers: { Authorization: `Bearer ${token}` }
 });
 setEditingUserId(null);
 fetchUsers();
 } catch (err) {
 console.error(err);
 toast.error(err.response?.data?.detail || "Failed to update user");
 }
 };

 const handleDeleteUser = async (userId) => {
 if (!window.confirm("Are you sure you want to suspend this user? They will be moved to the Recycle Bin for 60 days.")) return;
 try {
 const token = localStorage.getItem('token');
 await axios.delete(`http://127.0.0.1:8000/api/admin/users/${userId}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 fetchUsers();
 } catch (err) {
 console.error("Failed to delete user:", err);
 toast.error(err.response?.data?.detail || "Failed to delete user");
 }
 };

 const handleRecoverUser = async (userId) => {
 try {
 const token = localStorage.getItem('token');
 await axios.post(`http://127.0.0.1:8000/api/admin/users/${userId}/recover`, {}, {
 headers: { Authorization: `Bearer ${token}` }
 });
 fetchRecycleBin();
 } catch (err) {
 console.error("Failed to recover user:", err);
 toast.error(err.response?.data?.detail || "Failed to recover user");
 }
 };

 const handleRecoverRecord = async (recordId) => {
 try {
 const token = localStorage.getItem('token');
 await axios.post(`http://127.0.0.1:8000/api/admin/records/${recordId}/recover`, {}, {
 headers: { Authorization: `Bearer ${token}` }
 });
 fetchRecordsRecycleBin();
 } catch (err) {
 console.error("Failed to recover record:", err);
 toast.error(err.response?.data?.detail || "Failed to recover record");
 }
 };

 const handlePermanentDeleteRecord = async (recordId) => {
 if (!window.confirm("Are you sure you want to PERMANENTLY delete this record? This action cannot be undone by system administrators.")) return;
 try {
 const token = localStorage.getItem('token');
 await axios.delete(`http://127.0.0.1:8000/api/admin/records/${recordId}/permanent`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 fetchRecordsRecycleBin();
 } catch (err) {
 console.error("Failed to permanently delete record:", err);
 toast.error(err.response?.data?.detail || "Failed to permanently delete record");
 }
 };

 if (!['super_admin', 'manager', 'auditor'].includes(user?.role)) {
 return (
 <div className="flex flex-col items-center justify-center p-12 bg-red-50 text-red-700 rounded-2xl border border-red-200 shadow-sm text-center">
 <FaUserShield size={48} className="mb-4 opacity-80" />
 <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
 <p className="text-sm mt-2 font-medium">You do not have the required clearance to view this administrative terminal.</p>
 </div>
 );
 }

 if (selectedUserForDetails) {
 const u = selectedUserForDetails;
 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-primary">
 <FaIdBadge size={24} />
 </div>
 <div>
 <h2 className="text-xl font-bold text-slate-800 dark:text-gray-200 ">Additional Details</h2>
 <p className="text-sm text-slate-500 mt-1">Viewing full profile and details for {u.name || u.username}</p>
 </div>
 </div>
 <button
 onClick={() => {
 setSelectedUserForDetails(null);
 setIsEditingDetails(false);
 }}
 className="px-4 py-2 bg-slate-100 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold rounded-lg transition-colors shadow-sm"
 >
 Back to List
 </button>
 </div>

 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
 <div className="p-6 border-b border-slate-100 bg-slate-50 /50 flex justify-between items-center">
 <h3 className="text-lg font-bold text-slate-800 dark:text-gray-200 ">Profile Information</h3>
 <div className="flex space-x-2">
 {!isEditingDetails ? (
 <>
 <button
 onClick={() => {
 handleEditUser(u);
 setIsEditingDetails(true);
 }}
 className="text-text dark:text-dark-text bg-gray-100 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm disabled:opacity-50"
 disabled={user.role === 'auditor'}
 >
 <FaEdit className="mr-1.5" /> Edit User
 </button>
 {u.id !== user.id && (
 <button
 onClick={() => {
 handleDeleteUser(u.id);
 setSelectedUserForDetails(null);
 }}
 className="text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm disabled:opacity-50"
 disabled={user.role === 'auditor'}
 >
 Delete User
 </button>
 )}
 </>
 ) : (
 <>
 <button
 onClick={() => setIsEditingDetails(false)}
 className="text-muted dark:text-dark-muted bg-gray-100 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm transition-colors"
 >
 <FaTimes className="mr-1.5" /> Cancel
 </button>
 <button
 onClick={async (e) => {
 await handleSaveEditUser(e, u.id);
 setIsEditingDetails(false);
 setSelectedUserForDetails({ ...u, ...editUserForm });
 }}
 className="text-white bg-primary hover:bg-primary-hover border border-transparent px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm transition-colors"
 >
 <FaSave className="mr-1.5" /> Save
 </button>
 </>
 )}
 </div>
 </div>

 <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* Profile Info Cards */}
 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Name / Username</span>
 {isEditingDetails ? (
 <input
 type="text"
 value={editUserForm.name}
 onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
 className="w-full text-sm font-bold text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 mb-1"
 placeholder="Name"
 />
 ) : (
 <div className="font-bold text-slate-800 dark:text-gray-200 text-lg">{u.name || 'N/A'}</div>
 )}
 <div className="text-sm text-slate-500 font-mono mt-1">{u.username}</div>
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Info</span>
 {isEditingDetails ? (
 <>
 <input
 type="email"
 value={editUserForm.email}
 onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
 className="w-full text-sm font-medium text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 mb-2"
 placeholder="Email"
 />
 <input
 type="tel"
 value={editUserForm.phone}
 onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
 className="w-full text-sm text-slate-600 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 "
 placeholder="Phone"
 />
 </>
 ) : (
 <>
 <div className="font-medium text-slate-800 dark:text-gray-200 ">{u.email || 'N/A'}</div>
 <div className="text-sm text-slate-500 mt-1">{u.phone || 'N/A'}</div>
 </>
 )}
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Security Role</span>
 {isEditingDetails ? (
 <select
 value={editUserForm.role}
 onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
 className="w-full text-sm p-1.5 rounded border border-slate-300 dark:border-gray-600"
 disabled={user.role === 'auditor'}
 >
 <option value="forensic_analyst">Forensic Analyst</option>
 <option value="medical_examiner">Medical Examiner</option>
 <option value="super_admin">Super Admin</option>
 <option value="manager">Manager</option>
 <option value="auditor">Auditor</option>
 </select>
 ) : (
 <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold uppercase tracking-wider ${['super_admin', 'manager', 'auditor'].includes(u.role) ? 'bg-red-900/30 text-red-400 border border-red-800' :
 u.role === 'medical_examiner' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
 'bg-gray-100 text-muted dark:text-dark-muted border border-gray-200 dark:border-gray-600'
 }`}>
 {u.role.replace('_', ' ')}
 </span>
 )}
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Security Features</span>
 {isEditingDetails ? (
 <div className="space-y-2 mt-1">
 <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-gray-300 ">
 <input
 type="checkbox"
 checked={editUserForm.biometric_enabled}
 onChange={(e) => setEditUserForm({ ...editUserForm, biometric_enabled: e.target.checked })}
 className="rounded border-slate-300 dark:border-gray-600 text-gray-300 focus:ring-red-900"
 disabled={user.role === 'auditor'}
 />
 <span>Biometric Access Enabled</span>
 </label>
 </div>
 ) : (
 <div className="mt-1">
 {u.biometric_enabled ? (
 <span className="inline-flex items-center text-gray-300 border border-gray-700 bg-gray-800 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
 Biometrics: Active
 </span>
 ) : (
 <span className="inline-flex items-center text-slate-500 border border-slate-200 dark:border-gray-700 bg-slate-50 px-2.5 py-1 rounded-full text-xs font-bold">
 Biometrics: Inactive
 </span>
 )}
 </div>
 )}
 </div>

 {isEditingDetails && (
 <div className="bg-slate-50 rounded-lg p-4 border border-primary ring-2 ring-primary">
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">ID Proof Reference</span>
 <input
 type="text"
 value={editUserForm.id_proof}
 onChange={(e) => setEditUserForm({ ...editUserForm, id_proof: e.target.value })}
 className="w-full text-sm text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 "
 placeholder="ID Proof Reference"
 />
 </div>
 )}

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</span>
 {isEditingDetails ? (
 <select
 value={editUserForm.is_profile_complete ? 'true' : 'false'}
 onChange={(e) => setEditUserForm({ ...editUserForm, is_profile_complete: e.target.value === 'true' })}
 className="w-full text-sm p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 mt-1"
 >
 <option value="true">Verified</option>
 <option value="false">Unverified</option>
 </select>
 ) : u.is_profile_complete ? (
 <span className="inline-flex mt-1 items-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full text-xs font-bold uppercase shadow-sm">
 <FaCheckCircle className="mr-1.5" /> Verified
 </span>
 ) : (
 <span className="inline-flex mt-1 items-center text-slate-500 border border-slate-200 dark:border-gray-700 bg-slate-50 px-2.5 py-1 rounded-full text-xs font-bold uppercase">
 <FaTimes className="mr-1.5" /> Unverified
 </span>
 )}
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Age & Gender</span>
 {isEditingDetails ? (
 <div className="space-y-2">
 <input
 type="number"
 value={editUserForm.age}
 onChange={(e) => setEditUserForm({ ...editUserForm, age: e.target.value })}
 className="w-full text-sm text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 "
 placeholder="Age"
 />
 <select
 value={editUserForm.gender}
 onChange={(e) => setEditUserForm({ ...editUserForm, gender: e.target.value })}
 className="w-full text-sm p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 "
 >
 <option value="">Select Gender</option>
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 <option value="Prefer not to say">Prefer not to say</option>
 </select>
 </div>
 ) : (
 <>
 <div className="font-medium text-slate-800 dark:text-gray-200 mt-1">{u.age ? `${u.age} years` : 'Age N/A'}</div>
 <div className="text-sm text-slate-500 mt-0.5">{u.gender || 'Gender N/A'}</div>
 </>
 )}
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Date of Birth</span>
 {isEditingDetails ? (
 <input
 type="date"
 value={editUserForm.dob}
 onChange={(e) => setEditUserForm({ ...editUserForm, dob: e.target.value })}
 className="w-full text-sm text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 mt-1"
 />
 ) : (
 <div className="font-medium text-slate-800 dark:text-gray-200 mt-1">{u.dob ? new Date(u.dob).toLocaleDateString() : 'N/A'}</div>
 )}
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100 '}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Education</span>
 {isEditingDetails ? (
 <input
 type="text"
 value={editUserForm.education}
 onChange={(e) => setEditUserForm({ ...editUserForm, education: e.target.value })}
 className="w-full text-sm text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:border-gray-700 mt-1"
 placeholder="Highest Education"
 />
 ) : (
 <div className="font-medium text-slate-800 dark:text-gray-200 mt-1">{u.education || 'N/A'}</div>
 )}
 </div>

 <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary lg:col-span-2 md:col-span-2' : 'border-slate-100 lg:col-span-2 md:col-span-2'}`}>
 <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Specialization / Bio</span>
 {isEditingDetails ? (
 <textarea
 value={editUserForm.bio}
 onChange={(e) => setEditUserForm({ ...editUserForm, bio: e.target.value })}
 className="w-full text-sm text-slate-800 dark:text-gray-200 p-1.5 rounded border border-slate-300 dark:border-gray-600 mt-1 resize-y min-h-[80px]"
 placeholder="Professional Biography"
 />
 ) : (
 <div className="font-medium text-slate-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap mt-1">{u.bio || 'N/A'}</div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 flex items-start space-x-4">
 <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-primary">
 <FaUserShield size={24} />
 </div>
 <div>
 <h2 className="text-xl font-bold text-slate-800 dark:text-gray-200 ">Administrator Controls</h2>
 <p className="text-sm text-slate-500 mt-1">Create and manage authorized personnel access securely. The accounts generated here will require the user to complete their profile upon first login.</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Create User Form */}
 {user?.role !== 'auditor' ? (
 <div className="glass-panel p-6 bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 ">
 <h3 className="text-md font-bold text-slate-800 dark:text-gray-200 border-b border-slate-100 pb-4 mb-5 flex items-center">
 <FaUserPlus className="mr-2 text-primary" /> Register New Analyst
 </h3>

 {error && (
 <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">Full Legal Name</label>
 <input type="text" name="name" required value={formData.name} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-600 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
 placeholder="Dr. John Doe"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center"><FaEnvelope className="mr-1 text-slate-400" /> Email Address</label>
 <input type="email" name="email" required value={formData.email} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-600 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
 placeholder="john@forensics.org"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center"><FaPhone className="mr-1 text-slate-400" /> Phone Number</label>
 <input type="tel" name="phone" required value={formData.phone} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-600 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
 placeholder="+1 (555) 000-0000"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center"><FaIdBadge className="mr-1 text-slate-400" /> ID Proof Reference</label>
 <input type="text" name="id_proof" required value={formData.id_proof} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-600 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
 placeholder="e.g. License/Badge ID"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">System Role</label>
 <select name="role" value={formData.role} onChange={handleChange}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-600 focus:ring-2 focus:ring-red-900 outline-none bg-white dark:bg-gray-900 dark:border-gray-700 "
 >
 <option value="forensic_analyst">Forensic Analyst</option>
 <option value="medical_examiner">Medical Examiner</option>
 <option value="super_admin">Super Admin</option>
 <option value="manager">Manager</option>
 <option value="auditor">Auditor</option>
 </select>
 </div>
 </div>

 <button type="submit" disabled={loading}
 className={`w-full py-2.5 px-4 mt-2 rounded-lg text-white font-medium transition-all shadow-sm ${loading ? 'bg-red-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover'}`}
 >
 {loading ? 'Creating Identity...' : 'Generate Access Credentials'}
 </button>
 </form>
 </div>
 ) : (
 <div className="glass-panel p-6 bg-slate-50 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 shadow-inner">
 <FaUserShield size={48} className="text-slate-300 mb-4" />
 <h3 className="text-lg font-bold text-slate-500 ">Registration Restricted</h3>
 <p className="text-sm text-slate-400 mt-2 text-center">As an Auditor, you possess read-only clearance. Identity creation is restricted to Super Admins and Managers.</p>
 </div>
 )}

 {/* Success/Output Panel */}
 <div className="glass-panel p-6 bg-slate-50 flex flex-col justify-center rounded-xl border border-slate-200 dark:border-gray-700 shadow-inner min-h-[300px]">
 {success ? (
 <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
 <div className="mx-auto bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 w-16 h-16 rounded-full flex items-center justify-center mb-2">
 <FaCheckCircle size={32} />
 </div>
 <h3 className="text-xl font-bold text-slate-800 dark:text-gray-200 ">Account Generated</h3>
 <p className="text-sm text-slate-500 px-4">Provide these temporary credentials to the new user securely. They will be prompted to set their own password upon first login.</p>

 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-200 dark:border-gray-700 rounded-lg p-5 mt-4 text-left shadow-sm">
 <div className="mb-3 border-b border-slate-100 pb-3">
 <span className="text-xs font-bold text-slate-400 uppercase">Generated Username</span>
 <div className="text-lg font-mono font-bold text-text dark:text-dark-text select-all">{success.username}</div>
 </div>
 <div>
 <span className="text-xs font-bold text-slate-400 uppercase">Temporary Passcode</span>
 <div className="text-lg font-mono font-bold text-primary select-all">{success.password}</div>
 </div>
 </div>
 </div>
 ) : (
 <div className="text-center text-slate-400 flex flex-col items-center">
 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
 <FaClipboardList className="text-3xl text-slate-300 " />
 </div>
 <p className="font-medium text-slate-500">Awaiting Registration Submission</p>
 <p className="text-xs mt-2 max-w-[200px]">Generated credentials will appear here securely instead of sending via unencrypted email.</p>
 </div>
 )}
 </div>
 </div>

 {/* Registered Personnel Directory */}
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden mt-8">
 <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50/50 gap-4">
 <div>
 <h3 className="text-lg font-bold text-slate-800 dark:text-gray-200 flex items-center">
 <FaUsers className="mr-3 text-gray-300" /> Personnel Management
 </h3>
 <p className="text-sm text-slate-500 mt-1">Review active accounts or recover suspended accounts.</p>
 </div>

 <div className="flex bg-slate-200/60 p-1 rounded-lg">
 <button
 onClick={() => setAdminTab('active')}
 className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${adminTab === 'active' ? 'bg-white dark:bg-gray-900 dark:border-gray-700 text-gray-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-slate-200'}`}
 >
 Active Roster
 </button>
 <button
 onClick={() => setAdminTab('recycle')}
 className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${adminTab === 'recycle' ? 'bg-white dark:bg-gray-900 dark:border-gray-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-slate-200'}`}
 >
 Personnel Waitlist
 </button>
 <button
 onClick={() => setAdminTab('records_recycle')}
 className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${adminTab === 'records_recycle' ? 'bg-white dark:bg-gray-900 dark:border-gray-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-slate-200'}`}
 >
 Records Recycle Bin
 </button>
 <button
 onClick={() => setAdminTab('verifications')}
 className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${adminTab === 'verifications' ? 'bg-white dark:bg-gray-900 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-300 dark:hover:text-slate-200'}`}
 >
 Verify IDs
 </button>
 </div>
 </div>

 <div className="overflow-x-auto">
 {adminTab === 'verifications' ? (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-200 dark:border-gray-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
 <th className="py-4 px-6">Username</th>
 <th className="py-4 px-6">Doc Type</th>
 <th className="py-4 px-6">Document Image</th>
 <th className="py-4 px-6">Status</th>
 <th className="py-4 px-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm">
 {loadingVerifications ? (
 <tr>
 <td colSpan="5" className="py-12 text-center text-slate-400">Loading verifications...</td>
 </tr>
 ) : verificationsList.length === 0 ? (
 <tr>
 <td colSpan="5" className="py-12 text-center text-slate-500 bg-slate-50/50">No pending ID verifications found.</td>
 </tr>
 ) : (
 verificationsList.map(v => (
 <tr key={v.id} className="hover:bg-gray-800/30 transition-colors">
 <td className="py-4 px-6 font-bold text-slate-800 dark:text-gray-200 ">{v.username}</td>
 <td className="py-4 px-6 text-slate-700 dark:text-gray-300">{v.document_type}</td>
 <td className="py-4 px-6">
 <a href={`http://127.0.0.1:8000${v.document_path}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">View Document</a>
 </td>
 <td className="py-4 px-6">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${v.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
 v.status === 'rejected' ? 'bg-red-100 text-red-800' :
 'bg-amber-100 text-amber-800'
 }`}>
 {v.status}
 </span>
 </td>
 <td className="py-4 px-6 text-right space-x-2">
 {v.status === 'pending' && (
 <>
 <button onClick={() => handleVerifyStatus(v.id, 'approve')} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase disabled:opacity-50" disabled={user.role === 'auditor'}>
 <FaCheckCircle className="inline mr-1" /> Approve
 </button>
 <button onClick={() => handleVerifyStatus(v.id, 'reject')} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase disabled:opacity-50" disabled={user.role === 'auditor'}>
 <FaTimes className="inline mr-1" /> Reject
 </button>
 </>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 ) : adminTab === 'active' ? (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-200 dark:border-gray-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
 <th className="py-4 px-6">Name / Username</th>
 <th className="py-4 px-6">Contact Info</th>
 <th className="py-4 px-6">Security Role</th>
 <th className="py-4 px-6 text-center">Status</th>
 <th className="py-4 px-6 text-right">Other Details</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm">
 {loadingUsers ? (
 <tr>
 <td colSpan="5" className="py-12 text-center text-slate-400">
 <div className="w-6 h-6 border-2 border-gray-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
 Decrypting personnel records...
 </td>
 </tr>
 ) : usersList.length === 0 ? (
 <tr>
 <td colSpan="5" className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
 No active registered personnel found.
 </td>
 </tr>
 ) : (
 usersList.map(u => (
 editingUserId === u.id ? (
 <tr key={u.id} className="bg-gray-800/50">
 <td className="py-2 px-6" colSpan="5">
 <form onSubmit={(e) => handleSaveEditUser(e, u.id)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
 <div className="md:col-span-1">
 <input type="text" className="w-full text-xs p-2 rounded border border-slate-300 dark:border-gray-600" placeholder="Name" value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} required />
 <input type="text" className="w-full text-xs p-2 mt-1 rounded border border-slate-300 dark:border-gray-600" placeholder="ID Proof" value={editUserForm.id_proof} onChange={(e) => setEditUserForm({ ...editUserForm, id_proof: e.target.value })} required />
 </div>
 <div className="md:col-span-1">
 <input type="email" className="w-full text-xs p-2 rounded border border-slate-300 dark:border-gray-600" placeholder="Email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} required />
 <input type="tel" className="w-full text-xs p-2 mt-1 rounded border border-slate-300 dark:border-gray-600" placeholder="Phone" value={editUserForm.phone} onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })} required />
 </div>
 <div className="md:col-span-1">
 <select className="w-full text-xs p-2 rounded border border-slate-300 dark:border-gray-600" value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} disabled={user.role === 'auditor'}>
 <option value="forensic_analyst">Forensic Analyst</option>
 <option value="medical_examiner">Medical Examiner</option>
 <option value="super_admin">Super Admin</option>
 <option value="manager">Manager</option>
 <option value="auditor">Auditor</option>
 </select>
 </div>
 <div className="md:col-span-1 text-right flex space-x-2 justify-end">
 <button type="button" onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-xs text-slate-600 bg-white dark:bg-gray-900 dark:border-gray-700 border border-slate-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-lg transition-colors">Cancel</button>
 <button type="submit" disabled={user.role === 'auditor'} className="px-3 py-1.5 text-xs text-white bg-gray-800 hover:bg-gray-800 font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50">Save</button>
 </div>
 </form>
 </td>
 </tr>
 ) : (
 <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
 <td className="py-4 px-6">
 <div className="font-bold text-slate-800 dark:text-gray-200 ">{u.name || 'Pending Name'}</div>
 <div className="text-xs text-slate-500 font-mono mt-0.5">{u.username}</div>
 </td>
 <td className="py-4 px-6">
 <div className="text-slate-700 dark:text-gray-300">{u.email || 'N/A'}</div>
 <div className="text-xs text-slate-500 mt-0.5">{u.phone || 'N/A'}</div>
 </td>
 <td className="py-4 px-6">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${['super_admin', 'manager', 'auditor'].includes(u.role) ? 'bg-gray-800 text-gray-300 border border-gray-700' :
 u.role === 'medical_examiner' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
 'bg-gray-800 text-gray-300 border border-gray-700'
 }`}>
 {u.role.replace('_', ' ')}
 </span>
 </td>
 <td className="py-4 px-6 text-center">
 {u.is_profile_complete ? (
 <span className="inline-flex items-center text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm">
 <FaCheck className="mr-1.5" size={10} /> Active
 </span>
 ) : (
 <span className="inline-flex items-center text-slate-500 border border-slate-200 dark:border-gray-700 bg-slate-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
 <FaTimes className="mr-1.5" size={10} /> Incomplete
 </span>
 )}
 </td>
 <td className="py-4 px-6 text-right">
 <button
 onClick={() => setSelectedUserForDetails(u)}
 className="text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 hover:border-gray-700 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-sm"
 >
 More Details
 </button>
 </td>
 </tr>
 )
 ))
 )}
 </tbody>
 </table>
 ) : adminTab === 'recycle' ? (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-200 dark:border-gray-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
 <th className="py-4 px-6">Name / Username</th>
 <th className="py-4 px-6">Security Role</th>
 <th className="py-4 px-6">Deletion Date</th>
 <th className="py-4 px-6">Expiration</th>
 <th className="py-4 px-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm">
 {loadingRecycle ? (
 <tr>
 <td colSpan="5" className="py-12 text-center text-slate-400">
 <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
 Loading recycle bin...
 </td>
 </tr>
 ) : recycleBinList.length === 0 ? (
 <tr>
 <td colSpan="5" className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
 Recycle bin is empty. Null data.
 </td>
 </tr>
 ) : (
 recycleBinList.map(u => (
 <React.Fragment key={u.id}>
 <tr className="hover:bg-red-50/30 transition-colors opacity-75">
 <td className="py-4 px-6">
 <div className="font-bold text-slate-800 dark:text-gray-200 line-through decoration-slate-400">{u.name || 'Pending Name'}</div>
 <div className="text-xs text-slate-500 font-mono mt-0.5">{u.username}</div>
 </td>
 <td className="py-4 px-6">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 dark:border-gray-700`}>
 {u.role.replace('_', ' ')}
 </span>
 </td>
 <td className="py-4 px-6 text-slate-600">
 {new Date(u.deleted_at).toLocaleDateString()}
 </td>
 <td className="py-4 px-6">
 <span className="text-xs font-bold text-red-500 flex items-center">
 <FaClock className="mr-1.5" /> {u.days_remaining} days left
 </span>
 <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Before Auto-Purge</p>
 </td>
 <td className="py-4 px-6 text-right space-x-2 flex justify-end">
 <button
 onClick={() => setViewingProfileId(viewingProfileId === u.id ? null : u.id)}
 className="text-slate-600 hover:text-slate-800 dark:text-gray-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-gray-700 text-xs font-bold uppercase tracking-wider"
 >
 {viewingProfileId === u.id ? 'Hide Profile' : 'View Profile'}
 </button>
 <button
 onClick={() => handleRecoverUser(u.id)}
 className="text-gray-300 hover:text-gray-300 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors border border-gray-700 text-xs font-bold uppercase tracking-wider"
 >
 Recover
 </button>
 </td>
 </tr>
 {viewingProfileId === u.id && (
 <tr className="bg-slate-50/50">
 <td colSpan="5" className="p-4 border-b border-t border-slate-200 dark:border-gray-700">
 <div className="flex bg-white dark:bg-gray-900 dark:border-gray-700 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm gap-6">
 <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center text-4xl font-bold text-slate-300">
 {u.photo ? <img src={u.photo} alt="Profile" className="w-full h-full object-cover" /> : u.username?.[0]?.toUpperCase()}
 </div>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 flex-1 text-sm">
 <div><span className="block text-xs font-bold text-slate-400 uppercase">Email</span><span className="font-medium text-slate-700 dark:text-gray-300">{u.email || 'N/A'}</span></div>
 <div><span className="block text-xs font-bold text-slate-400 uppercase">Phone</span><span className="font-medium text-slate-700 dark:text-gray-300">{u.phone || 'N/A'}</span></div>
 <div><span className="block text-xs font-bold text-slate-400 uppercase">Date of Birth</span><span className="font-medium text-slate-700 dark:text-gray-300">{u.dob ? new Date(u.dob).toLocaleDateString() : 'N/A'}</span></div>
 <div><span className="block text-xs font-bold text-slate-400 uppercase">Gender</span><span className="font-medium text-slate-700 dark:text-gray-300">{u.gender || 'N/A'}</span></div>
 <div className="col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase">Education</span><span className="font-medium text-slate-700 dark:text-gray-300">{u.education || 'N/A'}</span></div>
 <div className="col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase">Bio / Expertise</span><span className="font-medium text-slate-700 dark:text-gray-300">{u.bio || 'N/A'}</span></div>
 </div>
 </div>
 </td>
 </tr>
 )}
 </React.Fragment>
 ))
 )}
 </tbody>
 </table>
 ) : adminTab === 'records_recycle' ? (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-200 dark:border-gray-700 text-xs uppercase tracking-wider text-slate-500 font-bold">
 <th className="py-4 px-6">Record Details</th>
 <th className="py-4 px-6">Confidence</th>
 <th className="py-4 px-6">Deletion Date</th>
 <th className="py-4 px-6 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm">
 {loadingRecordsRecycle ? (
 <tr>
 <td colSpan="4" className="py-12 text-center text-slate-400">
 <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
 Loading deleted records...
 </td>
 </tr>
 ) : recycleBinRecords.length === 0 ? (
 <tr>
 <td colSpan="4" className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
 Records recycle bin is empty.
 </td>
 </tr>
 ) : (
 recycleBinRecords.map(r => (
 <tr key={r.id} className="hover:bg-orange-50/30 transition-colors opacity-80">
 <td className="py-4 px-6">
 <div className="font-bold text-slate-800 dark:text-gray-200 ">{r.weapon_type ? r.weapon_type.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}</div>
 <div className="text-xs text-slate-500 mt-0.5">Analyst: {r.user?.name || r.user?.username || 'Unknown'}</div>
 </td>
 <td className="py-4 px-6 text-slate-700 dark:text-gray-300">
 {r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : 'N/A'}
 </td>
 <td className="py-4 px-6 text-slate-600">
 {new Date(r.deleted_at).toLocaleString()}
 </td>
 <td className="py-4 px-6 text-right space-x-2 flex justify-end">
 <button
 onClick={() => handleRecoverRecord(r.id)}
 className="text-orange-600 hover:text-white hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors border border-orange-200 hover:border-orange-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50"
 disabled={user.role === 'auditor'}
 >
 Recover
 </button>
 <button
 onClick={() => handlePermanentDeleteRecord(r.id)}
 className="text-red-600 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors border border-red-200 hover:border-red-600 text-xs font-bold uppercase tracking-wider shadow-sm disabled:opacity-50"
 disabled={user.role === 'auditor'}
 >
 Delete
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 ) : null}
 </div>
 </div>
 </div>
 );
};

export default AdminDashboard;
