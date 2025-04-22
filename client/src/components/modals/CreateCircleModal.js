// client/src/components/modals/CreateCircleModal.js
import React, { useState } from 'react';
import axios from 'axios';
import './CreateCircleModal.css'; // Ensure this CSS file exists

function CreateCircleModal({ isOpen, onClose, onCircleCreated }) {
    // State for form fields
    const [circleName, setCircleName] = useState('');
    const [description, setDescription] = useState('');
    const [requiredAmount, setRequiredAmount] = useState(''); // Mandatory now
    const [isAutoSplit, setIsAutoSplit] = useState(true); // Default ON
    const [memberUpiInput, setMemberUpiInput] = useState('');
    const [initialMembers, setInitialMembers] = useState([]); // Store added UPI IDs

    // State for feedback/loading
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Add member to the temporary list
    const handleAddMember = () => {
        const newUpi = memberUpiInput.trim().toLowerCase(); // Store lowercase for easier comparison
        if (newUpi && newUpi.includes('@')) {
             if (!initialMembers.includes(newUpi)) {
                setInitialMembers([...initialMembers, newUpi]);
                setMemberUpiInput('');
                setError('');
            } else {
                setError('Member UPI ID already added to the list.');
                setTimeout(() => setError(''), 3000);
            }
        } else {
             setError('Please enter a valid UPI ID format (e.g., user@bank).');
             setTimeout(() => setError(''), 3000);
        }
    };

    // Remove member from the temporary list
    const handleRemoveMember = (upiToRemove) => {
        setInitialMembers(initialMembers.filter(upi => upi !== upiToRemove));
    };

    // Handle final form submission
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // --- Frontend Validation ---
        if (!circleName.trim()) { setError('Circle Name is required.'); return; }
        // Ensure requiredAmount is entered and is zero or positive
        const reqAmountNum = parseFloat(requiredAmount);
        if (requiredAmount.trim() === '' || isNaN(reqAmountNum) || reqAmountNum < 0) {
            setError('Valid Required Amount is required (0 or more).'); return;
        }
        if (initialMembers.length === 0) { setError('Please add at least one member via UPI ID.'); return; }
        // --- End Frontend Validation ---

        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) { setError('Authentication Error.'); setIsLoading(false); return; }

        // Prepare data payload for the backend (NO initial contribution here)
        const payload = {
            name: circleName.trim(),
            description: description.trim() || undefined,
            requiredAmount: reqAmountNum, // Send as number
            isAutoSplit: isAutoSplit,
            initialMembers: initialMembers // Send the array of UPI IDs
        };

        try {
            console.log("Submitting Create Circle payload:", payload);
            // Backend route needs to be updated to handle this payload correctly
            const res = await axios.post('/api/circles', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log("Circle successfully created:", res.data);
            if (onCircleCreated) { onCircleCreated(); }
            handleCloseModal(); // Close modal on success

        } catch (err) {
            console.error("Create Circle Error:", err.response || err.message || err);
            // Display specific error message from backend (e.g., invalid UPIs)
            setError(err.response?.data?.msg || 'Failed to create circle. Check details or server logs.');
        } finally {
            setIsLoading(false);
        }
    };

    // Reset form state when closing the modal
    const handleCloseModal = () => {
        setCircleName(''); setDescription(''); setRequiredAmount('');
        // No initialPoolContribution state to reset
        setIsAutoSplit(true); setMemberUpiInput(''); setInitialMembers([]);
        setError(''); setIsLoading(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={handleCloseModal}>&times;</button>
                <h3>Create New Circle</h3>
                <p>Set up your circle. Funding and allocations happen after creation.</p>

                <form onSubmit={handleCreateSubmit}>
                    {/* Circle Name (Required) */}
                    <div className="form-group">
                        <label htmlFor="circleName">Circle Name *</label>
                        <input type="text" id="circleName" placeholder="E.g., Goa Trip, Monthly Bills" value={circleName} onChange={(e) => setCircleName(e.target.value)} required />
                    </div>
                    {/* Description (Optional) */}
                    <div className="form-group">
                        <label htmlFor="description">Description (Optional)</label>
                        <textarea id="description" placeholder="What is this circle for?" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                     {/* Required Amount (Required) */}
                     <div className="form-group">
                        <label htmlFor="requiredAmount">Target/Required Amount (₹) *</label>
                        <input type="number" id="requiredAmount" placeholder="Total estimated expense (e.g., 30000)" value={requiredAmount} onChange={(e) => setRequiredAmount(e.target.value)} required min="0" step="any" />
                    </div>
                    {/* REMOVED Initial Pool Contribution Input */}

                    {/* Auto Split Toggle */}
                     <div className="form-group form-toggle">
                         <label htmlFor="autoSplitToggle">Enable Auto-Splitting?</label>
                         <label className="switch"> <input type="checkbox" id="autoSplitToggle" checked={isAutoSplit} onChange={(e) => setIsAutoSplit(e.target.checked)} /> <span className="slider round"></span> </label>
                     </div>
                     <p style={{fontSize: '0.8em', color: '#666', marginTop: '-10px', marginBottom: '15px'}}>(ON = Pool contributions affect 'free money' allocation equally. OFF = Host allocates funds manually later.)</p>

                    {/* Add Initial Members (Required) */}
                    <div className="form-group">
                        <label htmlFor="memberUpiInput">Add Initial Members via UPI ID * (At least one)</label>
                        <div className="add-member-input-group">
                            <input type="text" id="memberUpiInput" placeholder="Enter registered member's UPI ID" value={memberUpiInput} onChange={(e) => setMemberUpiInput(e.target.value)} />
                            <button type="button" onClick={handleAddMember}>Add</button>
                        </div>
                         <ul className="added-members-list">
                             {initialMembers.length === 0 && <li style={{ fontStyle: 'italic', color: '#dc3545' }}>Please add at least one member.</li>}
                             {initialMembers.map((upi) => ( <li key={upi}> <span>{upi}</span> <button type="button" onClick={() => handleRemoveMember(upi)}>&times;</button> </li> ))}
                         </ul>
                    </div>

                    {error && <p className="form-message error">{error}</p>}

                    <div className="modal-actions">
                        <button type="button" onClick={handleCloseModal} disabled={isLoading}>Cancel</button>
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Circle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateCircleModal;