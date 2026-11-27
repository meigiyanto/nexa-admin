import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import './bootstrap';

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
const application = currentPath === '/login' ? <LoginPage /> : <Dashboard />;

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        {application}
    </React.StrictMode>
);
