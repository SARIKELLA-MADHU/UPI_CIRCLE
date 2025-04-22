import React from 'react';
import './TransactionItem.css'; // Create this CSS file too

function TransactionItem({ transaction }) {
    // Basic check
    if (!transaction) return null;

    // Prepare data for display
    const description = transaction.description || 'No Description';
    // --- Backend change needed to get paidByName ---
    const paidByName = transaction.paidByUserId?.name || 'Unknown User'; // Uncomment if you populate paidByUserId
    const circleName = transaction.circleId?.name || 'Unknown Circle';
    const date = transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A';
    const category = transaction.categoryId || 'Uncategorized'; // Display categoryId
    const amount = transaction.amount?.toFixed(2) || '0.00';

    // Placeholder for icon - replace with actual icon logic if needed
    const categoryIcon = <span className="tx-icon">💰</span>; // Example emoji

    return (
        <li className="transaction-item">
            <div className="tx-col tx-col-icon">{categoryIcon}</div>
            <div className="tx-col tx-col-desc">
                <span className="tx-desc-main">{description}</span>
                {/* Display "Paid by" if name is available */}
                <span className="tx-paid-by">Paid by {paidByName}</span>
                <span className="tx-paid-by">Paid by You</span> {/* Placeholder for now */}
            </div>
            <div className="tx-col tx-col-circle">{circleName}</div>
            <div className="tx-col tx-col-date">{date}</div>
            <div className="tx-col tx-col-category">{category}</div>
            <div className="tx-col tx-col-amount">- ₹{amount}</div>
        </li>
    );
}

export default TransactionItem;