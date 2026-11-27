import React from 'react';

export default function AuthLayout({ children }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-indigo-600 text-white">
                        <span className="text-xl font-extrabold">N</span>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nexa Admin</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Secure workspace access</p>
                </div>
                <section className="rounded-md border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                    {children}
                </section>
                <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Nexa Admin</p>
            </div>
        </main>
    );
}
