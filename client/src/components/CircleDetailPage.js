// client/src/components/CircleDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CircleDetailPage.css'; // Ensure this file exists and add styles as needed

function CircleDetailPage() {
    const { circleId } = useParams();
    const navigate = useNavigate();

    // --- State ---
    const [circleData, setCircleData] = useState(null);
    const [userData, setUserData] = useState(null); // Logged-in user
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // State for Contribution Section
    const [contributionAmount, setContributionAmount] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isContributing, setIsContributing] = useState(false);
    const [contributionError, setContributionError] = useState('');
    const [contributionSuccess, setContributionSuccess] = useState('');

    // State for "Set Limit" (Distribute Equally) Section
    const [limitAmountInput, setLimitAmountInput] = useState('');
    const [isSettingLimit, setIsSettingLimit] = useState(false);
    const [limitError, setLimitError] = useState('');
    const [limitSuccess, setLimitSuccess] = useState('');

    // State for "Manual Allocation" Section
    const [manualTargetMemberId, setManualTargetMemberId] = useState('');
    const [manualAllocationAmount, setManualAllocationAmount] = useState('');
    const [isAllocatingManual, setIsAllocatingManual] = useState(false);
    const [manualAllocError, setManualAllocError] = useState('');
    const [manualAllocSuccess, setManualAllocSuccess] = useState('');
    // --- End State ---


    // --- Data Fetching ---
    const fetchCircleDetails = useCallback(async (token) => {
        try {
            const res = await axios.get(`/api/circles/${circleId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            setCircleData(res.data);
        } catch (err) { throw err; }
    }, [circleId]);

     const fetchLoggedInUser = useCallback(async (token) => {
         try {
             const res = await axios.get('/api/auth/user', { headers: { 'Authorization': `Bearer ${token}` } });
             setUserData(res.data);
         } catch (err) { throw err; }
     }, []);

    // Combined initial load effect
    useEffect(() => {
        const loadAllDetails = async () => {
             setIsLoading(true); setError(''); setContributionError(''); setContributionSuccess(''); setLimitError(''); setLimitSuccess(''); setManualAllocError(''); setManualAllocSuccess('');
             const token = localStorage.getItem('token');
             if (!token) { navigate('/auth'); return; }
             try {
                 await Promise.all([ fetchCircleDetails(token), fetchLoggedInUser(token) ]);
             } catch (err) { /* ... main error handling ... */
                 console.error("CircleDetailPage: Error loading initial data:", err.response || err.message || err);
                 if (err.response && (err.response.status === 401 || err.response.status === 403)) { setError('Session expired or not authorized.'); localStorage.removeItem('token'); navigate('/auth'); }
                 else if (err.response && err.response.status === 404) { setError('Circle not found.'); }
                 else { setError('Failed to load circle details.'); }
                 setCircleData(null); setUserData(null);
             } finally { setIsLoading(false); }
        };
        loadAllDetails();
    }, [circleId, navigate, fetchCircleDetails, fetchLoggedInUser]);
    // --- End Data Fetching ---


    // --- Event Handlers ---
    // Placeholder for Add Member submit
    const handleAddMemberSubmit = (e) => { e.preventDefault(); alert('Add Member Submit - Not Implemented'); };

    // Handler for Individual Contribution Submit
    const handleContributeSubmit = async (e) => { /* ... Same as previous version ... */
        e.preventDefault();
        if (!termsAccepted) { setContributionError('You must accept the Terms & Conditions.'); return; }
        const amountToContribute = parseFloat(contributionAmount);
        if (isNaN(amountToContribute) || amountToContribute <= 0) { setContributionError('Please enter a valid positive amount.'); return; }
        setContributionError(''); setContributionSuccess(''); setIsContributing(true);
        const token = localStorage.getItem('token'); if (!token) { navigate('/auth'); return; }
        try {
            const res = await axios.post(`/api/circles/${circleId}/contribute`, { amount: amountToContribute }, { headers: { 'Authorization': `Bearer ${token}` } });
            setContributionSuccess(res.data.msg || 'Contribution successful!'); setContributionAmount(''); setTermsAccepted(false);
            fetchCircleDetails(token); // Use existing token
        } catch (err) { console.error("Contribute Error:", err.response || err); setContributionError(err.response?.data?.msg || 'Contribution failed.');
        } finally { setIsContributing(false); }
    };

    // Handler for Set Allocation Limit Submit (Distribute Equally)
    const handleSetLimitSubmit = async (e) => { /* ... Same as previous version ... */
        e.preventDefault(); setLimitError(''); setLimitSuccess('');
        const amountToAllocate = parseFloat(limitAmountInput);
        if (isNaN(amountToAllocate) || amountToAllocate <= 0) { setLimitError('Please enter a valid positive amount.'); return; }
        setIsSettingLimit(true); const token = localStorage.getItem('token'); if (!token) { navigate('/auth'); return; }
        try {
            const payload = { allocationLimitAmount: amountToAllocate };
            const res = await axios.post(`/api/circles/${circleId}/setAllocationLimit`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            setLimitSuccess(res.data.msg || 'Allocation limit set successfully!'); setLimitAmountInput('');
            fetchCircleDetails(token); // Use existing token
        } catch (err) { console.error("Set Limit Error:", err.response || err); setLimitError(err.response?.data?.msg || 'Failed to set allocation limit.');
        } finally { setIsSettingLimit(false); }
    };

    // Handler for Manual Allocation Submit
    const handleManualAllocateSubmit = async (e) => { /* ... Same as previous version ... */
        e.preventDefault(); setManualAllocError(''); setManualAllocSuccess('');
        const amountToAllocate = parseFloat(manualAllocationAmount);
        if (!manualTargetMemberId) { setManualAllocError('Please select a member.'); return; }
        if (isNaN(amountToAllocate) || amountToAllocate <= 0) { setManualAllocError('Please enter a valid positive amount.'); return; }
        setIsAllocatingManual(true); const token = localStorage.getItem('token'); if (!token) { navigate('/auth'); return; }
        try {
            const payload = { targetMemberUserId: manualTargetMemberId, amount: amountToAllocate };
            const res = await axios.post(`/api/circles/${circleId}/allocateManual`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            setManualAllocSuccess(res.data.msg || 'Allocation successful!'); setManualAllocationAmount(''); setManualTargetMemberId('');
            fetchCircleDetails(token); // Use existing token
        } catch (err) { console.error("Manual Allocate Error:", err.response || err); setManualAllocError(err.response?.data?.msg || 'Manual allocation failed.');
        } finally { setIsAllocatingManual(false); }
    };
    // --- End Event Handlers ---


    // --- Render Logic ---
    if (isLoading) return <p>Loading circle details...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!circleData) return <p>Could not load circle data.</p>;

    // Check if host AFTER data loads
    const isHost = userData && circleData.host && userData._id === circleData.host._id;

    return (
        <div className="circle-detail-page">

            {/* --- Section 1: Header Info --- */}
            <div className="detail-header detail-section"> {/* Added detail-section class */}
                 <h1>{circleData.name}</h1>
                 <p>{circleData.description || 'No description provided.'}</p>
                 <p>Host: {circleData.host?.name || 'Unknown'}</p>
                  <div className="balance-info">
                     <span>Pool Balance: ₹{circleData.poolBalance?.toFixed(2)}</span>
                     {circleData.requiredAmount > 0 && <span>Required: ₹{circleData.requiredAmount?.toFixed(2)}</span>}
                     <span>Mode: {circleData.isAutoSplit ? 'Auto-Split' : 'Manual Allocation'}</span>
                  </div>
             </div>

             {/* --- Section 2: Members List & Add Member Form --- */}
              <div className="detail-section">
                  <h3>Members ({circleData.members?.length || 0})</h3>
                  <ul className="member-list">
                     {circleData.members?.map(member => (
                        <li key={'mem-'+member.userId?._id}>
                            <div>
                                <span className="member-name">{member.userId?.name || '...'}</span>
                                <span className="member-upi"> ({member.userId?.upiId || '...'})</span>
                            </div>
                            <span className="member-allocated">Allocated: ₹{member.allocatedBalance?.toFixed(2)}</span>
                        </li>
                     ))}
                  </ul>
                  {/* Add Member Form (Host Only - Placeholder Action) */}
                  {isHost && (
                      <form onSubmit={handleAddMemberSubmit} className="add-member-form">
                          <h4>Add New Member</h4>
                          <input type="text" placeholder="Enter UPI ID of registered user" required />
                          <button type="submit">Add Member</button>
                      </form>
                  )}
              </div>

             {/* --- Section 3: Contribute Funds (For All Members) --- */}
             <div className="detail-section">
                 <h3>Contribute Funds</h3>
                 <form onSubmit={handleContributeSubmit} className="contribute-form">
                    {/* ... Amount Input ... */}
                    <div className="form-group"> <label htmlFor="contributionAmount">Amount You Want to Contribute (₹)</label> <input id="contributionAmount" type="number" placeholder="Enter amount" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} required min="0.01" step="any" disabled={isContributing} /> </div>
                    {/* ... T&C Checkbox ... */}
                    <div className="form-group terms-group" style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}> <input type="checkbox" id="termsCheck" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} required style={{ marginRight: '8px' }} /> <label htmlFor="termsCheck" style={{ marginBottom: '0', fontWeight: 'normal', fontSize: '0.9em' }}> I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</a> </label> </div>
                    {/* ... Feedback Messages ... */}
                    {contributionError && <p className="form-message error">{contributionError}</p>} {contributionSuccess && <p className="form-message success">{contributionSuccess}</p>}
                    {/* ... Submit Button ... */}
                    <button type="submit" className="contribute-submit-button" style={{ marginTop: '15px', width: '100%' }} disabled={!termsAccepted || isContributing || !contributionAmount || parseFloat(contributionAmount) <= 0} > {isContributing ? 'Contributing...' : 'Contribute to Pool'} </button>
                 </form>
             </div>

            {/* --- Section 4: Host Controls (Conditional) --- */}
            {isHost && ( // Only render this whole section if the user is the host
                 <div className="detail-section host-controls"> {/* Added class for styling */}
                    <h3>Host Controls</h3>

                    {/* --- Conditionally show one allocation form or the other --- */}
                    {circleData.isAutoSplit ? (
                        /* --- Sub-Section: Distribute Equally (Auto-Split ON) --- */
                        <div className="allocation-form-section">
                             <h4>Set Member Spending Limit (Distribute Equally)</h4>
                             <p>Allocate funds from the Pool Balance (₹{circleData.poolBalance?.toFixed(2)}) to be split equally among all {circleData.members?.length || 0} members.</p>
                             <form onSubmit={handleSetLimitSubmit} className="set-limit-form">
                                  <div className="form-group"> <label htmlFor="limitAmountInput">Total Amount to Allocate from Pool (₹)</label> <input id="limitAmountInput" type="number" placeholder="e.g., 1000" value={limitAmountInput} onChange={(e) => setLimitAmountInput(e.target.value)} required min="0.01" step="any" disabled={isSettingLimit} /> </div>
                                 {limitError && <p className="form-message error">{limitError}</p>}
                                 {limitSuccess && <p className="form-message success">{limitSuccess}</p>}
                                  <button type="submit" className="set-limit-button" style={{marginTop: '10px', width: '100%'}} disabled={isSettingLimit || !limitAmountInput || parseFloat(limitAmountInput) <= 0} > {isSettingLimit ? 'Setting Limit...' : 'Set & Allocate Limit'} </button>
                             </form>
                        </div>

                    ) : (

                        /* --- Sub-Section: Manual Allocation (Auto-Split OFF) --- */
                        <div className="allocation-form-section">
                            <h4>Manual Allocation</h4>
                            <p>Allocate funds from the Pool Balance (₹{circleData.poolBalance?.toFixed(2)}) to a specific member.</p>
                            <form onSubmit={handleManualAllocateSubmit} className="allocate-form">
                                <div className="form-group">
                                    <label htmlFor="targetMember">Allocate To Member:</label>
                                    <select id="targetMember" value={manualTargetMemberId} onChange={(e) => setManualTargetMemberId(e.target.value)} required disabled={isAllocatingManual} >
                                        <option value="">-- Select Member --</option>
                                        {circleData.members?.filter(m => m.userId?._id !== userData?._id).map(member => ( <option key={member.userId?._id} value={member.userId?._id}> {member.userId?.name || 'Unknown'} ({member.userId?.upiId}) </option> ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                     <label htmlFor="allocationAmount">Amount to Allocate (₹)</label>
                                     <input id="allocationAmount" type="number" placeholder="Amount from pool" value={manualAllocationAmount} onChange={(e) => setManualAllocationAmount(e.target.value)} required min="0.01" step="any" disabled={isAllocatingManual} />
                                </div>
                                {manualAllocError && <p className="form-message error">{manualAllocError}</p>}
                                {manualAllocSuccess && <p className="form-message success">{manualAllocSuccess}</p>}
                                 <button type="submit" className="allocate-button" style={{marginTop: '10px', width: '100%'}} disabled={isAllocatingManual || !manualTargetMemberId || !manualAllocationAmount || parseFloat(manualAllocationAmount) <= 0} > {isAllocatingManual ? 'Allocating...' : 'Allocate Funds to Member'} </button>
                            </form>
                        </div>
                    )}
                     {/* --- End Conditional Forms --- */}


                     {/* --- Current Allocations Display (Always show for host) --- */}
                     <div style={{marginTop: '25px'}}>
                         <h4>Current Member Allocations:</h4>
                         <ul className='member-list'>
                             {circleData.members?.map(member => (
                                <li key={'alloc-display-'+member.userId?._id}>
                                    <span>{member.userId?.name || '...'}</span>
                                    <span>Allocated: ₹{member.allocatedBalance?.toFixed(2)}</span>
                                </li>
                             ))}
                         </ul>
                     </div>
                     {/* --- --- */}

                </div> // End host-controls div
             )}
             {/* --- End Section 4: Host Controls --- */}

        </div> // End circle-detail-page div
    );
}

export default CircleDetailPage;