import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import axios from 'axios';
import Alert from '../components/Alert';
import AuthLayout from '../layouts/AuthLayout';

export default function PasswordResetPage() {
    const token = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
    const [email, setEmail] = useState(new URLSearchParams(window.location.search).get('email') || '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async event => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await axios.get('/sanctum/csrf-cookie');
            const { data } = await axios.post('/api/reset-password', {
                token, email, password, password_confirmation: passwordConfirmation,
            });
            setMessage(data.message);
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;
            setError(errors?.email?.[0] || errors?.token?.[0] || errors?.password?.[0] || requestError.response?.data?.message || 'Unable to reset your password. Please request a new link.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-7 flex items-center gap-3">
                <div className="rounded-md bg-indigo-600 p-3 text-white"><KeyRound size={22}/></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Set a new password</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Choose a strong password for your account.</p>
                </div>
            </div>
            {message ? (
                <>
                    <Alert type="success">{message}</Alert>
                    <a href="/login" className="mt-5 block w-full rounded-md bg-indigo-600 py-3 text-center font-semibold text-white hover:bg-indigo-700">Return to sign in</a>
                </>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address
                        <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                    </label>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New password
                        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                    </label>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm new password
                        <input type="password" required minLength={8} autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                    </label>
                    {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
                    <button disabled={loading} className="w-full rounded-md bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {loading ? 'Resetting...' : 'Reset password'}
                    </button>
                </form>
            )}
            {!message && <div className="mt-5 text-center"><a href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Back to sign in</a></div>}
        </AuthLayout>
    );
}
