// client/src/components/CircleListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import axios from 'axios';
import CircleCard from './CircleCard'; // Import the card component
import './DashboardPage.css'; // Use dashboard styles or create specific CircleListPage.css

function CircleListPage() {
    const navigate = useNavigate(); // Import if redirecting on auth error
    const [circles, setCircles] = useState([]);
    const [isLoadingCircles, setIsLoadingCircles] = useState(true);
    const [circlesError, setCirclesError] = useState('');

    // Function to fetch circles
    const fetchCircles = useCallback(async (token) => {
        setIsLoadingCircles(true);
        setCirclesError('');
        try {
            const res = await axios.get('/api/circles', { headers: { 'Authorization': `Bearer ${token}` } });
            setCircles(res.data || []);
        } catch (err) {
            console.error("CircleListPage: Error fetching circles:", err.response || err.message || err);
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 setCirclesError('Session expired. Please log in again.');
                 // Optional: Trigger logout if needed, but ProtectedRoute might handle it
                 // localStorage.removeItem('token'); navigate('/auth');
             } else {
                setCirclesError('Failed to load circles.');
             }
        } finally {
            setIsLoadingCircles(false);
        }
    }, []); // Removed navigate dependency

    // Fetch circles when component mounts
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchCircles(token);
        } else {
            // Should be caught by ProtectedRoute, but good fallback
            setCirclesError("Not logged in.");
            setIsLoadingCircles(false);
            // navigate('/auth'); // Avoid navigation in basic effect if ProtectedRoute handles it
        }
    }, [fetchCircles]);

    return (
        // Render ONLY the circle list section
        <div className="circle-list-page dashboard-section"> {/* Use relevant classes */}
            <div className="section-header">
                {/* Heading specific to this page */}
                <h2>My Circles</h2>
                {/* No "View All" needed here as this IS the 'all' view */}
            </div>

            <div className="circles-list" style={{ marginTop: '20px' }}>
                {isLoadingCircles ? (
                    <p>Loading circles...</p>
                ) : circlesError ? (
                    <p style={{ color: 'red' }}>{circlesError}</p>
                ) : circles.length === 0 ? (
                    <p>You are not a member of any circles yet.</p>
                ) : (
                    <div className="circles-grid"> {/* Ensure CSS for this exists */}
                        {/* Map over ALL fetched circles */}
                        {circles.map(circle => (
                            <CircleCard key={circle._id} circle={circle} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CircleListPage;