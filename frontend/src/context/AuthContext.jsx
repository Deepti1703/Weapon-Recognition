import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);

 const login = (userData, token) => {
 setUser(userData);
 localStorage.setItem('token', token);
 localStorage.setItem('user', JSON.stringify(userData));
 };

 const updateUser = (newUserData) => {
 setUser(newUserData);
 localStorage.setItem('user', JSON.stringify(newUserData));
 };

 const logout = () => {
 setUser(null);
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 };

 useEffect(() => {
 // Check if user is logged in on mount
 const token = localStorage.getItem('token');
 const storedUser = localStorage.getItem('user');
 if (token && storedUser) {
 try {
 setUser(JSON.parse(storedUser));
 } catch (e) {
 logout();
 }
 }
 setLoading(false);
 }, []);

 // Auto-logout security feature: log out if they leave the tab/window
 useEffect(() => {
 const handleVisibilityChange = () => {
 if (document.hidden && user) {
 console.log("Security trigger: Window lost focus. Executing auto-logout.");
 logout();
 }
 };

 document.addEventListener("visibilitychange", handleVisibilityChange);

 return () => {
 document.removeEventListener("visibilitychange", handleVisibilityChange);
 };
 }, [user]);

 return (
 <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
 {children}
 </AuthContext.Provider>
 );
};

export const useAuth = () => useContext(AuthContext);
