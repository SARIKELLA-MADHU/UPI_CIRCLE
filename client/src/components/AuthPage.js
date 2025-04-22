// client/src/components/AuthPage.js
import React, { useState } from 'react';
import SignupForm from './SignupForm'; // Make sure path is correct
import LoginForm from './LoginForm';   // We need to create/adapt this next
import './AuthPage.css'; // We'll create this CSS file

function AuthPage() {
    const [isLoginView, setIsLoginView] = useState(false); // Start with Register active

    return (
        <div className="auth-container">
            {/* Left Column: Form Area */}
            <div className="auth-form-area">
                <div className="auth-logo">
                    {/* Replace with your actual logo or name */}
                    <h2>UPI Circle</h2> {/* Example */}
                </div>

                <div className="auth-toggle">
                    <button
                        className={!isLoginView ? 'active' : ''}
                        onClick={() => setIsLoginView(false)}
                    >
                        Register
                    </button>
                    <button
                        className={isLoginView ? 'active' : ''}
                        onClick={() => setIsLoginView(true)}
                    >
                        Login
                    </button>
                </div>

                {/* Conditionally render the correct form */}
                {isLoginView ? <LoginForm /> : <SignupForm />}
            </div>

            {/* Right Column: Info Area */}
            <div className="auth-info-area">
                <h2>Simulated Group Transactions Made Simple</h2>
                <p>
                    UPI Circle is a platform for managing group expenses without
                    real payments. Create circles, track expenses, and understand
                    your spending patterns.
                </p>
                {/* Add feature list - use proper list tags */}
                <ul>
                    <li><strong>Create Circles:</strong> Form groups with friends, roommates, or colleagues to manage shared expenses.</li>
                    <li><strong>Track Transactions:</strong> Record and monitor all payments within your circles.</li>
                    <li><strong>AI-Powered Insights:</strong> Get intelligent categorization and suggestions to improve your spending habits.</li>
                </ul>
            </div>
        </div>
    );
}

export default AuthPage;