import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext(null);

export const useToast = () => {
 const context = useContext(ToastContext);
 if (!context) {
 throw new Error('useToast must be used within a ToastProvider');
 }
 return context;
};

export const ToastProvider = ({ children }) => {
 const [toasts, setToasts] = useState([]);

 const removeToast = useCallback((id) => {
 setToasts((prev) => prev.filter((toast) => toast.id !== id));
 }, []);

 const addToast = useCallback((message, type = 'success') => {
 const id = Math.random().toString(36).substr(2, 9);
 setToasts((prev) => [...prev, { id, message, type }]);
 setTimeout(() => {
 removeToast(id);
 }, 3000);
 }, [removeToast]);

 const value = useMemo(() => ({
 success: (msg) => addToast(msg, 'success'),
 error: (msg) => addToast(msg, 'error'),
 warning: (msg) => addToast(msg, 'warning'),
 }), [addToast]);

 return (
 <ToastContext.Provider value={value}>
 {children}
 <div className="fixed bottom-4 right-4 z-[9999] flex flex-col space-y-2 pointer-events-none">
 {toasts.map((toast) => (
 <div
 key={toast.id}
 className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border w-80 text-white font-bold transform transition-all translate-y-0 scale-100 ${toast.type === 'success' ? 'bg-green-600 border-green-800' :
 toast.type === 'error' ? 'bg-red-600 border-red-800' :
 'bg-yellow-500 border-yellow-700'
 }`}
 role="alert"
 >
 <div className="flex items-center space-x-3 text-sm">
 {toast.type === 'success' && <FaCheckCircle size={18} />}
 {toast.type === 'error' && <FaTimesCircle size={18} />}
 {toast.type === 'warning' && <FaExclamationTriangle size={18} />}
 <span>{toast.message}</span>
 </div>
 <button onClick={() => removeToast(toast.id)} className="ml-4 hover:opacity-75 focus:outline-none">
 <FaTimes />
 </button>
 </div>
 ))}
 </div>
 </ToastContext.Provider>
 );
};
