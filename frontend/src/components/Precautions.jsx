import React from 'react';
import { FaExclamationTriangle, FaShieldAlt, FaBalanceScale } from 'react-icons/fa';

const Precautions = () => {
 return (
 <div className="bg-white dark:bg-gray-900 dark:border-gray-700 rounded-lg shadow-md p-6 mb-8 mt-8 border border-red-100 dark:border-red-900/30 print:hidden">
 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
 <FaExclamationTriangle className="text-red-500 mr-3" />
 Forensic Guidelines & Precautions
 </h2>

 <div className="grid md:grid-cols-3 gap-6">
 {/* Safety */}
 <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
 <h3 className="font-bold text-red-800 dark:text-red-400 mb-3 flex items-center">
 <FaShieldAlt className="mr-2" />
 Safety Guidelines
 </h3>
 <ul className="list-disc pl-4 text-sm text-red-900 dark:text-red-300 space-y-2">
 <li>Assume all physical evidence is biologically hazardous. Use proper PPE.</li>
 <li>Do not alter or clean wounds before photographic documentation is complete.</li>
 <li>Be cautious of sharp edges or debris remaining within the wound site.</li>
 </ul>
 </div>

 {/* Ethical */}
 <div className="bg-gray-800 /10 p-4 rounded-lg border border-gray-700 dark:border-gray-700/30">
 <h3 className="font-bold text-gray-300 mb-3 flex items-center">
 <FaExclamationTriangle className="mr-2" />
 Ethical Protocols
 </h3>
 <ul className="list-disc pl-4 text-sm text-gray-300 space-y-2">
 <li>Maintain victim dignity; limit exposure of non-relevant anatomical areas in photographs.</li>
 <li>Never manipulate detection software to achieve a pre-determined or biased result.</li>
 <li>Ensure peer-review for critical edge cases that may significantly impact investigations.</li>
 </ul>
 </div>

 {/* Legal */}
 <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
 <h3 className="font-bold text-green-800 dark:text-green-400 mb-3 flex items-center">
 <FaBalanceScale className="mr-2" />
 Legal Requirements
 </h3>
 <ul className="list-disc pl-4 text-sm text-green-900 dark:text-green-300 space-y-2">
 <li>Maintain an unbroken Chain of Custody for all digital and physical evidence.</li>
 <li>Ensure timestamps on all analysis records correspond exactly to system logs.</li>
 <li>Digital enhancements of images must be limited to brightness/contrast and explicitly documented.</li>
 </ul>
 </div>
 </div>
 </div>
 );
};

export default Precautions;
