// client/src/components/SignupForm.js
import React, { useState } from 'react';
import axios from 'axios';
// We will create AuthForm.css later

function SignupForm() {
    const [formData, setFormData] = useState({ name: '', upiId: '', phoneNumber: '', email: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { name, upiId, phoneNumber, email } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setMessage(''); setError('');
        try {
            const res = await axios.post('/api/auth/signup', formData); // Proxy should handle URL
            setMessage(res.data.msg || 'Signup successful!');
            setFormData({ name: '', upiId: '', phoneNumber: '', email: '' }); // Clear form
        } catch (err) {
            setError(err.response?.data?.msg || 'Signup failed.');
            console.error(err.response || err.message || err);
        }
    };

    return (
        <div className="auth-form"> {/* Use class for styling */}
            <h3>Create an account</h3>
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="signup-name">Name</label>
                    <input id="signup-name" type="text" placeholder="Enter your name" name="name" value={name} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="signup-upiId">UPI ID</label>
                    <input id="signup-upiId" type="text" placeholder="Enter your UPI ID" name="upiId" value={upiId} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="signup-phone">Phone Number</label>
                    <input id="signup-phone" type="tel" placeholder="Enter your phone number" name="phoneNumber" value={phoneNumber} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="signup-email">Email</label>
                    <input id="signup-email" type="email" placeholder="Enter your email" name="email" value={email} onChange={onChange} required />
                </div>
                <button type="submit" className="auth-button">Create account</button>
            </form>
        </div>
    );
}

export default SignupForm;