import React, { useRef, useState, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaCamera } from 'react-icons/fa';

const BiometricAuth = ({ onVerify, onCancel, username, isRegistration }) => {
 const webcamRef = useRef(null);
 const [isScanning, setIsScanning] = useState(false);
 const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success, error

 const [livenessPrompt, setLivenessPrompt] = useState('');
 const [captureCount, setCaptureCount] = useState(0);

 const livenessHints = useMemo(() => [
 "Position your face clearly in the center.",
 "Turn your face slightly to the left.",
 "Turn your face slightly to the right.",
 "Look up slightly.",
 "Look straight ahead to finish."
 ], []);

 const totalFrames = 5;

 const captureAndVerify = useCallback(() => {
 setIsScanning(true);
 setScanStatus('scanning');

 let count = 0;
 const captures = [];
 setCaptureCount(0);
 setLivenessPrompt(livenessHints[0]);

 const captureInterval = setInterval(() => {
 const imageSrc = webcamRef.current?.getScreenshot();
 if (imageSrc) {
 captures.push(imageSrc);
 count++;
 setCaptureCount(count);

 if (count < totalFrames) {
 setLivenessPrompt(livenessHints[count] || livenessHints[livenessHints.length - 1]);
 } else {
 clearInterval(captureInterval);
 setScanStatus('success');
 setTimeout(() => {
 if (isRegistration) {
 onVerify({ username, face_data: captures });
 } else {
 // Strict biometric login: send multiple live frames for liveness + one-to-one verification
 onVerify({ username, face_frames: captures });
 }
 }, 1000);
 }
 }
 }, 900);
 }, [webcamRef, onVerify, username, isRegistration, livenessHints]);

 return (
 <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm print:hidden">
 <div className="bg-card dark:bg-dark-card rounded-xl max-w-md w-full overflow-hidden border border-border dark:border-dark-border shadow-2xl transition-colors duration-300">
 <div className="p-6 text-center text-text dark:text-dark-text">
 <h2 className="text-2xl font-bold mb-2 flex justify-center items-center gap-2">
 <FaCamera className="text-primary" /> {isRegistration ? 'Register Face Identity' : 'Face Authentication'}
 </h2>

 {isScanning ? (
 <p className="text-red-300 font-semibold mb-6 animate-pulse text-lg">{livenessPrompt}</p>
 ) : (
 <p className="text-muted dark:text-dark-muted mb-6 text-sm">{isRegistration ? 'Capture multiple angles to securely register your identity.' : 'Capture live movement prompts for strict face verification.'}</p>
 )}

 <div className="relative mx-auto w-64 h-64 rounded-full overflow-hidden border-4 border-primary mb-6 bg-secondary dark:bg-dark-secondary shadow-[0_0_30px_rgba(220,38,38,0.3)] transition-colors duration-300">
 <Webcam
 audio={false}
 ref={webcamRef}
 screenshotFormat="image/jpeg"
 className="w-full h-full object-cover"
 mirrored={true}
 />

 {/* Overlay during scanning */}
 {scanStatus === 'scanning' && (
 <div className="absolute inset-0 bg-primary/20 flex flex-col items-center justify-center">
 <div className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-scan"></div>
 <FaSpinner className="animate-spin text-4xl text-white mt-4 opacity-80" />
 <div className="absolute bottom-4 left-0 right-0 text-center">
 <span className="bg-accent/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
 {captureCount}/{totalFrames}
 </span>
 </div>
 </div>
 )}

 {/* Success Overlay */}
 {scanStatus === 'success' && (
 <div className="absolute inset-0 bg-green-500/80 flex flex-col items-center justify-center backdrop-blur-sm">
 <FaCheckCircle className="text-6xl text-white mb-2" />
 <span className="font-bold text-white tracking-wider">VERIFIED</span>
 </div>
 )}

 {/* Error Overlay */}
 {scanStatus === 'error' && (
 <div className="absolute inset-0 bg-red-600/80 flex flex-col items-center justify-center backdrop-blur-sm">
 <FaTimesCircle className="text-6xl text-white mb-2" />
 <span className="font-bold text-white tracking-wider">FAILED</span>
 </div>
 )}
 </div>

 <div className="flex gap-4">
 <button
 onClick={onCancel}
 disabled={isScanning}
 className="flex-1 py-3 px-4 bg-secondary dark:bg-dark-secondary text-text dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50 border border-border dark:border-dark-border"
 >
 Cancel
 </button>
 <button
 onClick={captureAndVerify}
 disabled={isScanning || scanStatus === 'success'}
 className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover font-bold transition shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50"
 >
 {isScanning ? (isRegistration ? 'Capturing...' : 'Verifying...') : (isRegistration ? 'Capture Identity' : 'Start Live Scan')}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};

export default BiometricAuth;
