// client/src/components/LoginForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // <--- IMPORT useNavigate
import './AuthForm.css'; // Make sure this CSS file exists

function LoginForm() {
    const [formData, setFormData] = useState({ name: '', upiId: '' });
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { name, upiId } = formData;

    const navigate = useNavigate(); // <--- Initialize useNavigate hook

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
    const onOtpChange = e => setOtp(e.target.value);

    const handleInitiateLogin = async (e) => {
        e.preventDefault(); setIsLoading(true); setMessage(''); setError(''); setShowOtpInput(false);
        try {
             // Ensure API path is correct (initiate not initate)
            const res = await axios.post('/api/auth/login/initiate', formData);
            setMessage(res.data.msg || 'OTP sent!');
            setShowOtpInput(true);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to send OTP.');
            console.error("Initiate Login Error:", err.response || err.message || err); // Log error details
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyLogin = async (e) => {
        e.preventDefault(); setIsLoading(true); setMessage(''); setError('');
        try {
            const loginData = { ...formData, otp };
            const res = await axios.post('/api/auth/login/verify', loginData); // Verify OTP

            // If the above line doesn't throw an error (i.e., status is 2xx)
            setMessage('Login successful!'); // Optional: You might remove this as redirect indicates success
            localStorage.setItem('token', res.data.token); // Store the token

            console.log('Token stored. Attempting to navigate to /dashboard...'); // Log before navigating

            // --- PERFORM REDIRECT ---
            navigate('/dashboard'); // <--- ADDED THIS LINE to redirect
            // --- --- --- --- --- ---

        } catch (err) {
             // This block runs if axios gets a 4xx or 5xx response
            setError(err.response?.data?.msg || 'Login failed.');
            console.error("Verify Login Error:", err.response || err.message || err); // Log error details
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form">
            <h3>Login</h3>
            {/* Display only one message at a time */}
            {message && !error && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}

            {!showOtpInput ? (
                // Initial Login Form
                <form onSubmit={handleInitiateLogin}>
                    {/* ... Name and UPI ID inputs ... */}
                     <div className="form-group">
                         <label htmlFor="login-name">Name</label>
                         <input id="login-name" type="text" placeholder="Enter your name" name="name" value={name} onChange={onChange} required disabled={isLoading} />
                     </div>
                     <div className="form-group">
                         <label htmlFor="login-upiId">UPI ID</label>
                         <input id="login-upiId" type="text" placeholder="Enter your UPI ID" name="upiId" value={upiId} onChange={onChange} required disabled={isLoading} />
                     </div>
                     <button type="submit" className="auth-button" disabled={isLoading}>
                         {isLoading ? 'Sending...' : 'Send OTP'}
                     </button>
                </form>
            ) : (
                // OTP Verification Form
                <form onSubmit={handleVerifyLogin}>
                     <p>OTP sent to registered contact method for {name}.</p>
                     <div className="form-group">
                         <label htmlFor="login-otp">OTP</label>
                         <input id="login-otp" type="text" placeholder="Enter OTP" name="otp" value={otp} onChange={onOtpChange} required disabled={isLoading} />
                     </div>
                     <button type="submit" className="auth-button" disabled={isLoading}>
                         {isLoading ? 'Verifying...' : 'Login'}
                     </button>
                </form>
            )}
        </div>
    );
}

export default LoginForm;