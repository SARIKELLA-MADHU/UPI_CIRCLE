import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './CreateCircleModal.css'; // Reuse modal CSS or create AddExpenseForm.css

// Define categories list
const categories = [
  'Other', 'Food & Dining', 'Rent & Utilities', 'Transportation', 'Shopping',
  'Entertainment', 'Travel', 'Groceries', 'Education', 'Health & Medical'
];

function AddExpenseForm({ isOpen, onClose, onExpenseAdded }) {
    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCircleId, setSelectedCircleId] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Other');
    const [receiverUpiId, setReceiverUpiId] = useState('');

    // State for fetching circles
    const [userCircles, setUserCircles] = useState([]);
    const [isLoadingCircles, setIsLoadingCircles] = useState(false);
    const [fetchError, setFetchError] = useState(''); // Error fetching circles

    // General Form State
    const [formError, setFormError] = useState(''); // Error submitting form
    const [formSuccess, setFormSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch user's circles for dropdown
    const fetchUserCircles = useCallback(async (token) => {
        setIsLoadingCircles(true); setFetchError(''); setUserCircles([]);
        try {
            const res = await axios.get('/api/circles', { headers: { 'Authorization': `Bearer ${token}` } });
            setUserCircles(res.data || []);
        } catch (err) {
            console.error("AddExpenseForm: Error fetching circles:", err.response || err);
            setFetchError('Could not load your circles.');
        } finally { setIsLoadingCircles(false); }
    }, []);

    // Fetch circles when modal opens & Reset form
    useEffect(() => {
        if (isOpen) {
            console.log("AddExpenseForm: Opening, resetting state and fetching circles.");
            const token = localStorage.getItem('token');
            if (token) {
                fetchUserCircles(token);
            } else {
                setFetchError("Not auth.");
            }
            // Reset form fields
            setDescription(''); setAmount(''); setSelectedCircleId(''); setSelectedCategory('Other');
            setReceiverUpiId(''); setFormError(''); setFormSuccess('');
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, fetchUserCircles]);

    // Handle form submission
    const handleExpenseSubmit = async (e) => {
        e.preventDefault(); setFormError(''); setFormSuccess('');
        const expenseAmount = parseFloat(amount);

        // Validation
        if (!description.trim()) { setFormError('Description is required.'); return; }
        if (isNaN(expenseAmount) || expenseAmount <= 0) { setFormError('Valid Amount (> 0) is required.'); return; }
        if (!date) { setFormError('Date is required.'); return; }
        if (!selectedCircleId) { setFormError('Please select a circle.'); return; }
        if (!selectedCategory) { setFormError('Please select a category.'); return; }

        setIsSubmitting(true); const token = localStorage.getItem('token');
        if (!token) { setFormError("Auth error."); setIsSubmitting(false); return; }

        const payload = {
            description: description.trim(), amount: expenseAmount, date,
            circleId: selectedCircleId, categoryId: selectedCategory,
            receiverUpiId: receiverUpiId.trim() || undefined,
        };

        try {
            console.log("Adding Expense with payload:", payload);
            const res = await axios.post('/api/expenses', payload, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log("Expense added response:", res.data);
            setFormSuccess(res.data.msg || 'Expense added successfully!');
            setTimeout(() => { if (onExpenseAdded) onExpenseAdded(); onClose(); }, 1500); // Close after success
        } catch (err) {
            console.error("Add Expense Submit Error:", err.response || err.message || err);
            setFormError(err.response?.data?.msg || 'Failed to add expense.');
        } finally { setIsSubmitting(false); }
    };

    // Handle closing modal (resets state)
    const handleClose = () => {
        setDescription(''); setAmount(''); setSelectedCircleId(''); setSelectedCategory('Other');
        setReceiverUpiId(''); setFormError(''); setFormSuccess('');
        setDate(new Date().toISOString().split('T')[0]); setIsLoadingCircles(false);
        setUserCircles([]); setFetchError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={handleClose}>×</button>
                <h3>Add New Expense</h3>
                <p>Record an expense paid from your allocated funds.</p>

                <form onSubmit={handleExpenseSubmit}>
                    {/* Description */}
                    <div className="form-group"> <label htmlFor="expenseDescription">Description *</label> <input type="text" id="expenseDescription" placeholder="What was this expense for?" value={description} onChange={e => setDescription(e.target.value)} required disabled={isSubmitting}/> </div>

                    {/* Row for Amount & Date */}
                    <div className="form-row">
                        <div className="form-group"> <label htmlFor="expenseAmount">Amount (₹) *</label> <input type="number" id="expenseAmount" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="any" disabled={isSubmitting}/> </div>
                        <div className="form-group"> <label htmlFor="expenseDate">Date *</label> <input type="date" id="expenseDate" value={date} onChange={e => setDate(e.target.value)} required disabled={isSubmitting}/> </div>
                    </div>

                    {/* Row for Circle & Category */}
                    <div className="form-row">
                        <div className="form-group"> <label htmlFor="expenseCircle">Circle *</label> <select id="expenseCircle" value={selectedCircleId} onChange={e => setSelectedCircleId(e.target.value)} required disabled={isLoadingCircles || isSubmitting} > <option value="" disabled>-- Select Circle --</option> {fetchError && <option disabled>Error loading</option>} {!isLoadingCircles && userCircles.length === 0 && <option disabled>No circles found</option>} {userCircles.map(circle => ( <option key={circle._id} value={circle._id}>{circle.name}</option> ))} </select> {isLoadingCircles && <small>Loading...</small>} </div>
                        <div className="form-group"> <label htmlFor="expenseCategory">Category *</label> <select id="expenseCategory" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} required disabled={isSubmitting}> {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)} </select> </div>
                    </div>

                    {/* Receiver UPI ID */}
                    <div className="form-group"> <label htmlFor="receiverUpiId">Receiver UPI ID (Optional)</label> <input type="text" id="receiverUpiId" placeholder="e.g., shop@merchant" value={receiverUpiId} onChange={e => setReceiverUpiId(e.target.value)} disabled={isSubmitting}/> </div>

                    {/* Feedback Messages */}
                    {formError && <p className="form-message error">{formError}</p>}
                    {formSuccess && <p className="form-message success">{formSuccess}</p>}

                    {/* Action Buttons */}
                    <div className="modal-actions"> <button type="button" onClick={handleClose} disabled={isSubmitting}>Cancel</button> <button type="submit" className="proceed-button" disabled={isSubmitting}> {isSubmitting ? 'Processing...' : 'Proceed'} </button> </div>
                </form>
            </div>
        </div>
    );
}

export default AddExpenseForm;