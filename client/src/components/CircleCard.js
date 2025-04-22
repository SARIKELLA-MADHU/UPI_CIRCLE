// client/src/components/CircleCard.js
import React from 'react';
import './CircleCard.css'; // We'll create this CSS file
// client/src/components/CircleCard.js
import { Link } from 'react-router-dom'; // <<<--- ADD THIS LINE

// ... rest of the CircleCard component code

// Receives the circle object as a prop
function CircleCard({ circle }) {

    // Basic check if circle data is available
    if (!circle) {
        return <div className="circle-card loading">Loading...</div>;
    }

    // Placeholder logic for activity - replace later
    const lastActivity = "N/A";
    // Determine status text based on your logic (e.g., Active, Settled)
    const status = "Active"; // Example status
    // Display pool balance? Or user's balance *within* circle? Needs decision.
    // Let's show pool balance for now.
    const displayBalance = `₹${circle.poolBalance?.toFixed(2) || '0.00'}`;


    return (
        <div className="circle-card">
            <div className="card-header">
                <h4>{circle.name}</h4>
                <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
            </div>
            <div className="card-body">
                <p className="circle-id">Circle ID: {circle._id}</p> {/* Displaying DB ID for now */}
                <p className="member-count">Members: ({circle.members?.length || 0})</p>
                <div className="card-footer-info">
                     <span className="last-activity">Last activity: {lastActivity}</span>
                     <span className="circle-balance">Balance: {displayBalance}</span>
                </div>
            </div>
            <div className="card-actions">
                 {/* Link to a future detail page */}
                <Link to={`/circles/${circle._id}`} className="manage-link">Manage Circle &rarr;</Link>
            </div>
        </div>
    );
}

export default CircleCard;