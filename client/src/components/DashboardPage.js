// client/src/components/DashboardPage.js
import React from 'react'; // Only React is needed for layout usually
import { Outlet } from 'react-router-dom'; // Import Outlet to render child routes
import Sidebar from './Sidebar'; // Import the Sidebar
import './DashboardPage.css'; // Import layout CSS

// This component acts as the persistent layout for authenticated pages
function DashboardPage() {

    // No state or data fetching logic should be here for the layout itself.
    // Data fetching belongs in the child components rendered by Outlet, or in Sidebar/TopNav.

    return (
        <div className="dashboard-container"> {/* Main container with flex/grid for layout */}
            <Sidebar /> {/* Render the persistent sidebar */}

            <main className="dashboard-content">
                {/* Outlet is the placeholder where React Router will render */}
                {/* the matched child route component (DashboardHome or CircleListPage) */}
                <Outlet />
            </main>
        </div>
    );
}

export default DashboardPage;