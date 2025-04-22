// client/src/components/DashboardHome.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import CreateCircleModal from './modals/CreateCircleModal';
import AddExpenseForm from './modals/AddExpenseForm';
import JoinCircleModal from './modals/JoinCircleModal'; // <<< CORRECTED IMPORT
import CircleCard from './CircleCard';
import TransactionItem from './TransactionItem'; // Assuming you have this for recent transactions
import './DashboardPage.css';

function DashboardHome() {
    const navigate = useNavigate();

    // --- State Variables ---
    const [userData, setUserData] = useState(null);
    const [circles, setCircles] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false); // State for Join modal

    // --- Data Fetching ---
    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return;
        }
        try {
            const [userRes, circlesRes, transactionsRes] = await Promise.all([
                axios.get('/api/auth/user', { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get('/api/circles', { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get('/api/expenses/recent', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const balance = (typeof userRes.data.balance === 'number') ? userRes.data.balance : 0;
            setUserData({ ...userRes.data, balance });
            setCircles(circlesRes.data || []);
            setRecentTransactions(transactionsRes.data || []);

        } catch (err) {
            console.error("DashboardHome: Error loading data:", err.response || err.message || err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Session expired. Please log in again.');
                localStorage.removeItem('token');
                navigate('/auth');
            } else {
                setError('Failed to load dashboard data.');
            }
            setUserData(null); setCircles([]); setRecentTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // --- Modal Handlers ---
    const handleCreateCircleClick = () => setIsCreateModalOpen(true);
    const handleCloseCreateModal = () => setIsCreateModalOpen(false); // Consistent name
    const handleCircleCreated = () => {
        setIsCreateModalOpen(false);
        loadDashboardData();
    };

    const handleNewTransferClick = () => setIsExpenseModalOpen(true);
    const handleCloseExpenseModal = () => setIsExpenseModalOpen(false);
    const handleExpenseAdded = () => {
        setIsExpenseModalOpen(false);
        loadDashboardData();
    };

    // --- JOIN MODAL HANDLERS ---
    const handleJoinCircleClick = () => setIsJoinModalOpen(true);
    const handleCloseJoinModal = () => setIsJoinModalOpen(false);
    const handleCircleJoined = () => {
        setIsJoinModalOpen(false);
        loadDashboardData(); // Refresh data
    };
    // --- ---

    // --- Render Logic ---
    if (isLoading) return <div className="loading-container"><p>Loading dashboard...</p></div>;
    if (error) return <div className="error-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;
    if (!userData) return <div className="error-container"><p>Could not load user data. Please try logging in again.</p></div>;

    return (
        <>
            {/* Welcome Message */}
            <div className="welcome-message">
                <h2>Welcome to UPI Circle, {userData.name}</h2>
                <p>Manage your circles, transactions, and track expenses...</p>
            </div>

            {/* Action Cards */}
            <div className="action-cards-container">
                <div className="action-card" onClick={handleCreateCircleClick}><h4>Create Circle</h4></div>
                 {/* --- CORRECTED onClick for Join Circle Card --- */}
                <div className="action-card" onClick={handleJoinCircleClick}> {/* <<<--- USE CORRECT HANDLER */}
                     <h4>Join Circle</h4>
                 </div>
                 {/* --- --- */}
                <div className="action-card" onClick={handleNewTransferClick}><h4>New Transfer</h4></div>
                <div className="action-card" onClick={() => navigate('/analytics')}><h4>Analytics</h4></div>
            </div>

            {/* My Circles Section */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h3>My Circles</h3>
                    <Link to="/circles" className="view-all-link">View All &gt;</Link>
                </div>
                <div className="circles-list">
                    {circles.length === 0 ? ( <p>You have no circles yet.</p> ) : (
                        <div className="circles-grid">
                            {circles.slice(0, 3).map(circle => (
                                <CircleCard key={circle._id} circle={circle} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Transactions Section */}
            <div className="dashboard-section">
                 <div className="section-header">
                     <h3>Recent Transactions</h3>
                     <Link to="/history" className="view-all-link">View All &gt;</Link>
                 </div>
                 <div className="transaction-list-container">
                     {isLoading ? ( <p>Loading transactions...</p> )
                      : error ? ( <p style={{ color: 'red' }}>Error loading transactions.</p> ) // Check general error here
                      : recentTransactions.length === 0 ? ( <p>No recent transactions found.</p> )
                      : (
                         <ul className="transactions-list">
                             {recentTransactions.map(tx => (
                                 <TransactionItem key={tx._id} transaction={tx} />
                             ))}
                         </ul>
                     )}
                 </div>
             </div>

            {/* Modals */}
            <CreateCircleModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseCreateModal} // <<<--- USE CORRECTED HANDLER NAME
                onCircleCreated={handleCircleCreated}
            />
            <AddExpenseForm
                isOpen={isExpenseModalOpen}
                onClose={handleCloseExpenseModal}
                onExpenseAdded={handleExpenseAdded}
            />
            {/* --- ADDED JoinCircleModal RENDER --- */}
            <JoinCircleModal
                isOpen={isJoinModalOpen}
                onClose={handleCloseJoinModal}
                onCircleJoined={handleCircleJoined}
            />
            {/* --- --- */}
        </>
    );
}

export default DashboardHome;