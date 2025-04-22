import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import './CreateCircleModal.css'; // Can reuse styles or create JoinCircleModal.css// <<<--- ADD useEffect HERE

function JoinCircleModal({ isOpen, onClose, onCircleJoined }) {
    const [circleIdInput, setCircleIdInput] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleJoinSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const trimmedId = circleIdInput.trim();
        if (!trimmedId) {
            setError('Please enter a Circle ID.');
            return;
        }

        // Basic check if it looks like a potential ObjectId (optional)
        if (trimmedId.length !== 24 || !/^[a-fA-F0-9]+$/.test(trimmedId)) {
             setError('Invalid Circle ID format.');
             return;
        }

        setIsJoining(true);
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication error.');
            setIsJoining(false);
            // Handle redirect logic if necessary, maybe via parent context
            return;
        }

        try {
            console.log(`Attempting to join circle ID: ${trimmedId}`);
            // Use the ID in the URL path
            const res = await axios.post(`/api/circles/join/${trimmedId}`, {}, { // Empty body for POST is fine here
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setSuccess(res.data.msg || 'Successfully joined circle!');
            setCircleIdInput(''); // Clear input
            if (onCircleJoined) {
                 setTimeout(() => {
                    onCircleJoined(); // Call callback to refresh data in parent
                    onClose(); // Close the modal
                 }, 1500); // Delay slightly to show success message
            } else {
                 setTimeout(onClose, 1500);
            }

        } catch (err) {
            console.error("Join Circle Error:", err.response || err.message || err);
            setError(err.response?.data?.msg || 'Failed to join circle. Check the ID or if you are already a member.');
        } finally {
            setIsJoining(false);
        }
    };

    // Reset state when modal is closed externally
    useEffect(() => {
        if (!isOpen) {
            setCircleIdInput('');
            setError('');
            setSuccess('');
            setIsJoining(false);
        }
    }, [isOpen]);


    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                <h3>Join Existing Circle</h3>
                <p>Enter the unique ID of the circle you want to join.</p>

                <form onSubmit={handleJoinSubmit}>
                    <div className="form-group">
                        <label htmlFor="circleIdInput">Circle ID *</label>
                        <input
                            type="text"
                            id="circleIdInput"
                            placeholder="Paste Circle ID here"
                            value={circleIdInput}
                            onChange={(e) => setCircleIdInput(e.target.value)}
                            required
                            disabled={isJoining}
                        />
                    </div>

                    {error && <p className="form-message error">{error}</p>}
                    {success && <p className="form-message success">{success}</p>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={isJoining}>Cancel</button>
                        <button type="submit" className="proceed-button" disabled={isJoining}>
                            {isJoining ? 'Joining...' : 'Join Circle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default JoinCircleModal;