// client/src/components/Sidebar.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css'; // Ensure this file exists  

function Sidebar() {
    const navigate = useNavigate();
    // Initialize balance as well
    const [userData, setUserData] = useState({ name: '', email: '', balance: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // State for the "Add Money" feature
    const [showAddMoneyInput, setShowAddMoneyInput] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [addMoneyError, setAddMoneyError] = useState('');
    const [addMoneySuccess, setAddMoneySuccess] = useState('');
    const [isAddingMoney, setIsAddingMoney] = useState(false); // Loading state for adding money

    // Wrap fetchUserData in useCallback to prevent re-creation on every render
    const fetchUserData = useCallback(async () => {
        console.log("Sidebar: Fetching user data...");
        setIsLoading(true);
        setError(''); // Clear previous errors
        const token = localStorage.getItem('token');

        if (!token) {
            console.log("Sidebar: No token found, navigating to auth.");
            navigate('/auth');
            return;
        }

        try {
            const res = await axios.get('/api/auth/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Sidebar: User data received:", res.data);
            // Ensure balance is treated as a number, default to 0 if missing/invalid
            const balance = (typeof res.data.balance === 'number') ? res.data.balance : 0;
            setUserData({ ...res.data, balance }); // Set user data including balance
        } catch (err) {
            console.error("Sidebar: Error fetching user data:", err.response || err.message || err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Session expired. Please log in again.');
                localStorage.removeItem('token');
                navigate('/auth');
            } else {
                setError('Failed to load user data.');
            }
             setUserData({ name: '', email: '', balance: 0 }); // Reset data on error
        } finally {
             setIsLoading(false);
        }
    }, [navigate]); // Add navigate as dependency

    // Fetch data when component mounts
    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]); // fetchUserData is now stable due to useCallback

    // --- Functions for Add Money Feature ---
    const handleAddMoneyClick = () => {
        setShowAddMoneyInput(!showAddMoneyInput); // Toggle input display
        setAddAmount(''); // Clear amount input when toggling
        setAddMoneyError(''); // Clear previous errors/success messages
        setAddMoneySuccess('');
    };

    const handleAmountChange = (e) => {
        // Allow only numbers and optionally one decimal point
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
             setAddAmount(value);
        }
    };

    const handleConfirmAddMoney = async (e) => {
        e.preventDefault(); // Prevent form submission if using a form
        setAddMoneyError('');
        setAddMoneySuccess('');
        const amountToAdd = parseFloat(addAmount);

        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            setAddMoneyError("Please enter a valid positive amount.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication error. Please log in again.');
            navigate('/auth');
            return;
        }

        setIsAddingMoney(true); // Set loading state for add money button

        try {
            console.log(`Attempting to add balance: ${amountToAdd}`);
            const res = await axios.post('/api/user/addBalance',
                { amount: amountToAdd },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            console.log("Add balance response:", res.data);
            setAddMoneySuccess(res.data.msg || `Added ${amountToAdd} successfully!`);
            setShowAddMoneyInput(false); // Hide input on success
            setAddAmount(''); // Clear input field

            // Option 1: Update state directly (simpler if response reliable)
            setUserData(prevData => ({ ...prevData, balance: res.data.newBalance }));

            // Option 2: Refetch user data (ensures consistency)
            // await fetchUserData(); // Uncomment this if you prefer refetching

        } catch (err) {
            console.error("Error adding balance:", err.response || err);
            setAddMoneyError(err.response?.data?.msg || "Failed to add balance.");
            setShowAddMoneyInput(false); // Hide input on error
        } finally {
            setIsAddingMoney(false); // Reset loading state
        }
    };
    // --- End of Add Money Functions ---

    // --- Initials and Display Logic ---
    const getInitials = (name) => { /* ... same as before ... */
         if (isLoading || !name || typeof name !== 'string') return '';
         const parts = name.trim().split(' ');
         if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
         const lastNameInitial = parts[parts.length - 1] ? parts[parts.length - 1].charAt(0).toUpperCase() : '';
         return (parts[0].charAt(0).toUpperCase() + lastNameInitial);
    }
    const displayName = isLoading ? 'Loading...' : userData.name;
    const displayEmail = isLoading ? 'Loading...' : userData.email;
    // Format balance as currency (Indian Rupees)
    const displayBalance = isLoading ? 'Loading...' : `₹${userData.balance.toFixed(2)}`;
    // --- End of Initials and Display Logic ---


    // --- Logout Handler ---
    const handleLogout = () => { /* ... same as before ... */
        console.log("Sidebar: Logging out.");
        localStorage.removeItem('token');
        navigate('/auth');
    };
    // --- End of Logout Handler ---


    return (
        <aside className="sidebar">
            {/* ... Sidebar Header and Nav ... */}
             <div className="sidebar-header">
                 <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                     <h2>UPI Circle</h2>
                 </Link>
             </div>
             <nav className="sidebar-nav">
                 <Link to="/dashboard" className="nav-item active"><i className="icon-dashboard"></i> Dashboard</Link>
                 <Link to="/circles" className="nav-item"><i className="icon-circles"></i> My Circles</Link>
                 <Link to="/history" className="nav-item"><i className="icon-history"></i> History</Link>
                 <Link to="/analytics" className="nav-item"><i className="icon-analytics"></i> Analytics</Link>
                 <a href="#" className="nav-item"><i className="icon-settings"></i> Settings</a>
             </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">{getInitials(userData.name)}</div>
                    <div className="user-details">
                        <span className="user-name">{displayName}</span>
                        <span className="user-email">{displayEmail}</span>
                        {/* Display Balance */}
                        <span className="user-balance" style={{ marginTop: '5px', fontWeight: 'bold' }}>
                            Balance: {displayBalance}
                        </span>
                    </div>
                </div>

                {/* Display general fetch errors */}
                {error && <p className="sidebar-error">{error}</p>}

                {/* --- Add Money Section --- */}
                <div className="add-money-section">
                    {!showAddMoneyInput ? (
                        <button onClick={handleAddMoneyClick} className="generate-money-button">
                            Generate Money
                        </button>
                    ) : (
                        <form onSubmit={handleConfirmAddMoney} className="add-money-form">
                            <input
                                type="text" // Use text to allow decimal point easily
                                inputMode="decimal" // Hint for mobile keyboards
                                placeholder="Amount to add"
                                value={addAmount}
                                onChange={handleAmountChange}
                                required
                                disabled={isAddingMoney}
                            />
                            <button type="submit" disabled={isAddingMoney}>
                                {isAddingMoney ? 'Adding...' : 'Confirm'}
                            </button>
                            <button type="button" onClick={handleAddMoneyClick} disabled={isAddingMoney}>
                                Cancel
                            </button>
                        </form>
                    )}
                    {/* Display add money errors/success */}
                    {addMoneyError && <p className="sidebar-error" style={{ marginTop: '5px' }}>{addMoneyError}</p>}
                    {addMoneySuccess && <p className="sidebar-success" style={{ marginTop: '5px' }}>{addMoneySuccess}</p>}
                </div>
                 {/* --- End of Add Money Section --- */}


                <button onClick={handleLogout} className="logout-button">
                    <i className="icon-signout"></i> Sign out
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;