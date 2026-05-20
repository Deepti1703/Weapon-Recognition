import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaStethoscope, FaNotesMedical, FaSave, FaTimes, FaFileMedicalAlt, FaImage } from 'react-icons/fa';

const DoctorDashboard = () => {
 const { user } = useAuth();
 const toast = useToast();
 const [reports, setReports] = useState([]);
 const [loading, setLoading] = useState(true);
 const [selectedReport, setSelectedReport] = useState(null);
 const [notes, setNotes] = useState('');
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 fetchReports();
 }, []);

 const fetchReports = async () => {
 setLoading(true);
 try {
 const token = localStorage.getItem('token');
 // Depending on the backend route, it might be /api/doctor/reports or /api/history for all
 // Fallback to /api/history if doctor endpoint is missing
 let url = 'http://127.0.0.1:8000/api/doctor/reports';
 let response;
 try {
 response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
 } catch (err) {
 // If 404, fallback to an admin-level history fetch if possible, or history
 if (err.response && err.response.status === 404) {
 url = 'http://127.0.0.1:8000/api/history';
 response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
 } else {
 throw err;
 }
 }
 setReports(response.data);
 } catch (err) {
 console.error("Failed to fetch cases:", err);
 toast.error("Failed to load medical cases.");
 } finally {
 setLoading(false);
 }
 };

 const handleSaveNotes = async () => {
 if (!selectedReport) return;
 setSaving(true);
 try {
 const token = localStorage.getItem('token');
 await axios.post(`http://127.0.0.1:8000/api/doctor/reports/${selectedReport.id}/notes`,
 { notes },
 { headers: { Authorization: `Bearer ${token}` } }
 );
 toast.success("Medical notes saved successfully!");
 setSelectedReport(null);
 fetchReports();
 } catch (err) {
 console.error("Failed to save notes:", err);
 toast.error("Failed to save notes. Ensure backend supports this action.");
 } finally {
 setSaving(false);
 }
 };

 if (user?.role !== 'medical_examiner') {
 return (
 <div className="flex flex-col items-center justify-center p-12 bg-red-50 text-red-700 rounded-2xl border border-red-200">
 <FaStethoscope size={48} className="mb-4 opacity-80" />
 <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
 <p className="text-sm mt-2 font-medium">Only authorized Medical Examiners can access the Clinical Dashboard.</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 flex items-start space-x-4">
 <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
 <FaStethoscope size={24} />
 </div>
 <div>
 <h2 className="text-xl font-bold text-slate-800 dark:text-gray-200 ">Medical Examiner Dashboard</h2>
 <p className="text-sm text-slate-500 mt-1">Review forensic wound analyses and provide clinical observations.</p>
 </div>
 </div>

 {selectedReport ? (
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-300">
 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 /50">
 <h3 className="font-bold text-slate-800 dark:text-gray-200 flex items-center">
 <FaFileMedicalAlt className="mr-2 text-emerald-600" /> Case #{selectedReport.id} Details
 </h3>
 <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
 <FaTimes size={20} />
 </button>
 </div>
 <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 {selectedReport.image_path ? (
 <img src={`http://127.0.0.1:8000${selectedReport.image_path}`} alt="Wound" className="w-full h-auto rounded-lg border border-slate-200 dark:border-gray-700 object-cover max-h-[300px]" />
 ) : (
 <div className="h-[200px] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
 <FaImage size={48} />
 </div>
 )}
 <div className="mt-4 grid grid-cols-2 gap-4">
 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 dark:border-gray-700 ">
 <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Predicted Weapon</span>
 <span className="font-bold text-slate-800 dark:text-gray-200 ">{selectedReport.predicted_weapon}</span>
 </div>
 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 dark:border-gray-700 ">
 <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Wound Type</span>
 <span className="font-bold text-slate-800 dark:text-gray-200 ">{selectedReport.predicted_wound_type}</span>
 </div>
 </div>
 </div>
 <div className="flex flex-col h-full">
 <label className="text-sm font-bold text-slate-700 dark:text-gray-300 mb-2 flex items-center">
 <FaNotesMedical className="mr-2 text-emerald-600" /> Clinical Observations & Doctor's Notes
 </label>
 <textarea
 className="w-full flex-1 p-3 rounded-xl border border-slate-300 dark:border-gray-600 bg-slate-50 text-slate-800 dark:text-gray-200 min-h-[200px] outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
 placeholder="Enter your professional medical observations, discrepancies with algorithmic predictions, or formal case notes here..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 ></textarea>
 <button
 onClick={handleSaveNotes}
 disabled={saving}
 className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center"
 >
 {saving ? 'Saving Records...' : <><FaSave className="mr-2" /> Save Clinical Notes</>}
 </button>
 </div>
 </div>
 </div>
 ) : (
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
 <table className="w-full text-left">
 <thead className="bg-slate-50 /50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
 <tr>
 <th className="px-6 py-4">Case ID</th>
 <th className="px-6 py-4">Date</th>
 <th className="px-6 py-4">AI Prediction</th>
 <th className="px-6 py-4">Clinical Notes</th>
 <th className="px-6 py-4 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
 {loading ? (
 <tr><td colSpan="5" className="text-center py-12 text-slate-400"><div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent flex mx-auto rounded-full mb-2"></div>Loading cases...</td></tr>
 ) : reports.length === 0 ? (
 <tr><td colSpan="5" className="text-center py-12 text-slate-500 bg-slate-50/50 ">No cases available for review.</td></tr>
 ) : (
 reports.map(r => (
 <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
 <td className="px-6 py-3 font-bold text-slate-800 dark:text-gray-200 ">#{r.id}</td>
 <td className="px-6 py-3 text-slate-600 ">{new Date(r.timestamp).toLocaleDateString()}</td>
 <td className="px-6 py-3">
 <div className="font-medium text-slate-800 dark:text-gray-200 ">{r.predicted_weapon}</div>
 <div className="text-xs text-slate-500">{r.predicted_wound_type}</div>
 </td>
 <td className="px-6 py-3">
 {r.doctor_notes ? (
 <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit"><FaCheckCircle className="mr-1" /> Documented</span>
 ) : (
 <span className="text-amber-600 dark:text-amber-400 font-medium text-xs flex items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit">Pending Review</span>
 )}
 </td>
 <td className="px-6 py-3 text-right">
 <button
 onClick={() => { setSelectedReport(r); setNotes(r.doctor_notes || ''); }}
 className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 font-bold px-3 py-1.5 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-xs uppercase"
 >
 Review Case
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
};

export default DoctorDashboard;
