import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './pages/Dashboard';
import './bootstrap';

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <Dashboard />
    </React.StrictMode>
);
