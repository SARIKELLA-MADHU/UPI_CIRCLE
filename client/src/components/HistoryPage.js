import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TransactionItem from './TransactionItem'; // Reuse the component
import './HistoryPage.css'; // Create this CSS file for specific styles

function HistoryPage() {
    const navigate = useNavigate();

    const [allTransactions, setAllTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // --- State for Filters ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(''); // Store date as YYYY-MM-DD string

    // Fetch all transactions on mount
    const fetchAllTransactions = useCallback(async () => {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return;
        }
        try {
            // Use the new backend endpoint
            const res = await axios.get('/api/expenses/all', { headers: { 'Authorization': `Bearer ${token}` } });
            setAllTransactions(res.data || []);
        } catch (err) {
            console.error("HistoryPage: Error fetching transactions:", err.response || err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Session expired. Please log in again.');
                localStorage.removeItem('token');
                navigate('/auth');
            } else {
                setError('Failed to load transaction history.');
            }
            setAllTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAllTransactions();
    }, [fetchAllTransactions]);

    // --- Filtering Logic ---
    const filteredTransactions = useMemo(() => {
        let transactions = [...allTransactions];

        // Filter by Search Term (checks description, category, circle name)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            transactions = transactions.filter(tx =>
                tx.description?.toLowerCase().includes(lowerSearchTerm) ||
                tx.categoryId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.circleId?.name?.toLowerCase().includes(lowerSearchTerm)
                // Add more fields to search if needed
            );
        }

        // Filter by Selected Date
        if (selectedDate) {
            transactions = transactions.filter(tx => {
                if (!tx.date) return false;
                // Compare only the date part (YYYY-MM-DD)
                const transactionDate = new Date(tx.date).toISOString().split('T')[0];
                return transactionDate === selectedDate;
            });
        }

        return transactions;
    }, [allTransactions, searchTerm, selectedDate]);

    // --- Render ---

    if (isLoading) return <p>Loading history...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div className="history-page">
            <h1>Transaction History</h1>
            <p>View and track all your transaction history</p>

            {/* --- Filter Section --- */}
            <div className="filters-section">
                <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="date-input"
                />
                {/* Add dropdowns for Circle, Type/Category later if needed */}
                 <button onClick={() => { setSearchTerm(''); setSelectedDate(''); }} className="clear-filters-button">
                     Clear Filters
                 </button>
            </div>

            {/* --- Transactions List Section --- */}
            <div className="transaction-list-container history-list">
                 <h3>Transactions ({filteredTransactions.length})</h3>
                 {filteredTransactions.length === 0 ? (
                     <p>No transactions match your filters.</p>
                 ) : (
                     <ul className="transactions-list">
                         {filteredTransactions.map(tx => (
                             <TransactionItem key={tx._id} transaction={tx} />
                         ))}
                     </ul>
                 )}
            </div>
        </div>
    );
}

export default HistoryPage;