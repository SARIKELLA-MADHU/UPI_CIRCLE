// client/src/App.js
import React from 'react';
// Removed 'Outlet' from this import as it's not used directly in App.js JSX
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Page/Layout Components
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';    // The main Layout component
import DashboardHome from './components/DashboardHome';    // Content for /dashboard
import CircleListPage from './components/CircleListPage'; // Content for /circles
import CircleDetailPage from './components/CircleDetailPage';
import HistoryPage from './components/HistoryPage';
import AnalyticsPage from './components/AnalyticsPage'; // Content for /circles/:id

import './App.css';

// --- Authentication Helper ---
const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
};

// --- Protected Route Component ---
const ProtectedRoute = ({ children }) => {
     if (!isAuthenticated()) {
         return <Navigate to="/auth" replace />;
     }
     return children;
};
// --- ---

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Public Route */}
                    <Route path="/auth" element={<AuthPage />} />

                    {/* Protected Routes using Dashboard Layout */}
                    <Route
                        path="/" // Parent Path
                        element={
                            <ProtectedRoute>
                                <DashboardPage /> {/* Layout contains Outlet */}
                            </ProtectedRoute>
                        }
                    >
                        {/* Child Routes rendered via Outlet in DashboardPage */}
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardHome />} />
                        <Route path="circles" element={<CircleListPage />} />
                        <Route path="circles/:circleId" element={<CircleDetailPage />} />
                        <Route path="history" element={<HistoryPage />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        {/* Add other dashboard routes here */}
                    </Route>

                    {/* Catch-all Route */}
                    <Route path="*" element={
                        isAuthenticated()
                         ? <Navigate to="/dashboard" replace />
                         : <Navigate to="/auth" replace />
                    } />
                </Routes>
            </div>
        </Router>
    );
}

export default App;