import React from 'react';

export default function DashboardLayout({ children, sidebar, header, afterContent, sidebarCollapsed = false }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {sidebar}
            <div className={`transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {header}
                <main className="mx-auto max-w-[1440px] p-4 md:p-8">{children}</main>
            </div>
            {afterContent}
        </div>
    );
}
