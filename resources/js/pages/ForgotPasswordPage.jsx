import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import axios from 'axios';
import Alert from '../components/Alert';
import AuthLayout from '../layouts/AuthLayout';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
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
            const { data } = await axios.post('/api/forgot-password', { email });
            setMessage(data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.errors?.email?.[0] || requestError.response?.data?.message || 'Unable to send the reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-7 flex items-center gap-3">
                <div className="rounded-md bg-indigo-600 p-3 text-white"><Mail size={22}/></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Forgot password?</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">We will email you a secure reset link.</p>
                </div>
            </div>
            {message ? (
                <Alert type="success">{message}</Alert>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address
                        <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                    </label>
                    {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
                    <button disabled={loading} className="w-full rounded-md bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {loading ? 'Sending...' : 'Send reset link'}
                    </button>
                </form>
            )}
            <div className="mt-5 text-center">
                <a href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Back to sign in</a>
            </div>
        </AuthLayout>
    );
}
