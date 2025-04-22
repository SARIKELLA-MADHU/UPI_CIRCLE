// client/src/components/AnalyticsPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Pie, Bar } from 'react-chartjs-2'; // Import chart components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'; // Import necessary elements

import './AnalyticsPage.css'; // Create this CSS file

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function AnalyticsPage() {
    const navigate = useNavigate();

    // --- State ---
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'insights'
    const [overviewData, setOverviewData] = useState(null); // { summary, categorySpending, monthlyBreakdown }
    const [insightsData, setInsightsData] = useState([]); // Array of strings
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // --- REMOVED BACKEND AI INITIALIZATION FROM HERE ---
    // const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null; // REMOVE
    // const aiModel = genAI ? genAI.getGenerativeModel("gemini-pro") : null; // REMOVE

    // --- Data Fetching ---
    const loadAnalyticsData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) { navigate('/auth'); return; }

        try {
            // Fetch overview and insights data in parallel
            const [overviewRes, insightsRes] = await Promise.all([
                axios.get('/api/analytics/overview', { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get('/api/analytics/insights', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            setOverviewData(overviewRes.data);
            setInsightsData(insightsRes.data?.insights || []); // Expect { insights: [...] }

        } catch (err) {
            console.error("AnalyticsPage: Error loading data:", err.response || err);
             if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 503)) { // Added 503 check
                 // Display specific message for AI service unavailable
                 setError(err.response?.data?.msg || 'Failed to load analytics data.'); // Show backend msg if available
                 if (err.response.status !== 503) { // Don't logout for 503
                    localStorage.removeItem('token');
                    navigate('/auth');
                 }
             } else { setError('Failed to load analytics data.'); }
             setOverviewData(null); setInsightsData([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadAnalyticsData();
    }, [loadAnalyticsData]);

    // --- Chart Data Preparation ---

    const categoryChartData = useMemo(() => {
        // ... (Keep this code exactly as it was) ...
        if (!overviewData?.categorySpending) return { labels: [], datasets: [] };

        const labels = overviewData.categorySpending.map(item => item.category);
        const data = overviewData.categorySpending.map(item => item.amount);

        return {
            labels,
            datasets: [{
                label: 'Spending by Category',
                data,
                backgroundColor: [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FFCD56', '#4CAF50', '#E91E63' ],
                hoverOffset: 4
            }]
        };
    }, [overviewData]);

    const monthlyChartData = useMemo(() => {
        // ... (Keep this code exactly as it was) ...
         if (!overviewData?.monthlyBreakdown) return { labels: [], datasets: [] };

         const labels = overviewData.monthlyBreakdown.map(item => {
             const [year, month] = item.month.split('-');
             return new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
         });
         const productiveData = overviewData.monthlyBreakdown.map(item => item.productive);
         const nonProductiveData = overviewData.monthlyBreakdown.map(item => item.nonProductive);

         return {
             labels,
             datasets: [ { label: 'Productive', data: productiveData, backgroundColor: 'rgb(75, 192, 192)', }, { label: 'Non-Productive', data: nonProductiveData, backgroundColor: 'rgb(255, 99, 132)', }, ]
         };
     }, [overviewData]);

     const monthlyChartOptions = {
        // ... (Keep this code exactly as it was) ...
        plugins: { title: { display: true, text: 'Monthly Spending Breakdown' } },
        responsive: true,
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
     };

    // --- REMOVED BACKEND EXPRESS ROUTE DEFINITION FROM HERE ---
    // router.get('/insights', authMiddleware, async (req, res) => { ... }); // REMOVE

    // --- Render Logic ---

    if (isLoading) return <p>Loading analytics...</p>;
    // Use the main 'error' state here
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    // Optional: More specific message if overviewData is null after loading without error
    if (!overviewData) return <p>Could not load analytics overview data.</p>;


    return (
        <div className="analytics-page">
            <h1>Analytics</h1>
            <p>Analyze your spending patterns and get insights</p>

            {/* --- Tab Navigation --- */}
            <div className="analytics-tabs">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
                    onClick={() => setActiveTab('insights')}
                >
                    Insights
                </button>
            </div>

            {/* --- Tab Content --- */}
            <div className="analytics-content">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        {/* Summary Cards */}
                        <div className="summary-cards">
                             {/* ... (Keep JSX for summary cards) ... */}
                              <div className="summary-card"><h4>Total Spending</h4><p>₹{overviewData.summary?.totalSpending?.toFixed(2) ?? '0.00'}</p></div>
                              <div className="summary-card"><h4>Productive Spending</h4><p>₹{overviewData.summary?.productiveSpending?.toFixed(2) ?? '0.00'}</p>{overviewData.summary?.totalSpending > 0 &&<small>{((overviewData.summary.productiveSpending / overviewData.summary.totalSpending) * 100).toFixed(0)}% of total</small> }</div>
                              <div className="summary-card"><h4>Non-Productive Spending</h4><p>₹{overviewData.summary?.nonProductiveSpending?.toFixed(2) ?? '0.00'}</p>{overviewData.summary?.totalSpending > 0 &&<small>{((overviewData.summary.nonProductiveSpending / overviewData.summary.totalSpending) * 100).toFixed(0)}% of total</small> }</div>
                        </div>

                        {/* Charts */}
                         <div className="charts-container">
                            {/* ... (Keep JSX for Pie and Bar charts) ... */}
                              <div className="chart-wrapper pie-chart"><h4>Spending by Category</h4>{overviewData.categorySpending?.length > 0 ? (<Pie data={categoryChartData} />) : <p>No category data available.</p>}</div>
                              <div className="chart-wrapper bar-chart">{overviewData.monthlyBreakdown?.length > 0 ? (<Bar options={monthlyChartOptions} data={monthlyChartData} />) : <p>No monthly data available.</p>}</div>
                         </div>
                    </div>
                )}

                {activeTab === 'insights' && (
                    <div className="insights-tab">
                        <h3>AI Generated Insights</h3>
                         {/* Check loading state specifically for insights if needed, or rely on main load */}
                         {insightsData.length === 0 && !error ? ( // Show message only if no error occurred
                             <p>No insights available based on recent activity.</p>
                         ) : (
                             <ul className="insights-list">
                                 {insightsData.map((insight, index) => (
                                     <li key={index}>{insight}</li>
                                 ))}
                             </ul>
                         )}
                          {/* Display general error if insights failed but overview might have loaded */}
                          {error && insightsData.length === 0 && <p style={{ color: 'red' }}>{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
export default AnalyticsPage;