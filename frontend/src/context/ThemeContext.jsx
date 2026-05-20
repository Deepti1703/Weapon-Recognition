import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
 const [isDarkMode, setIsDarkMode] = useState(() => {
 // Check localStorage first
 const savedTheme = localStorage.getItem('theme');
 if (savedTheme) {
 return savedTheme === 'dark';
 }
 // Default to light mode if no preference saved (like mobile apps)
 return false;
 });

 useEffect(() => {
 // Apply theme class to html element
 if (isDarkMode) {
 document.documentElement.classList.add('dark');
 localStorage.setItem('theme', 'dark');
 } else {
 document.documentElement.classList.remove('dark');
 localStorage.setItem('theme', 'light');
 }
 }, [isDarkMode]);

 const toggleTheme = () => {
 setIsDarkMode(!isDarkMode);
 };

 return (
 <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
 {children}
 </ThemeContext.Provider>
 );
};
