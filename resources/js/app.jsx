import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PasswordResetPage from './pages/PasswordResetPage';
import './bootstrap';

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
const application = currentPath === '/login' ? <LoginPage />
    : currentPath === '/forgot-password' ? <ForgotPasswordPage />
    : currentPath.startsWith('/reset-password/') ? <PasswordResetPage />
    : <Dashboard />;

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        {application}
    </React.StrictMode>
);
