import React, { useEffect, useState } from 'react';
import { LayoutDashboard, LoaderCircle } from 'lucide-react';
import axios from 'axios';
import Alert from '../components/Alert';
import AuthLayout from '../layouts/AuthLayout';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState('checking');

    useEffect(() => {
        let active = true;
        axios.get('/api/user')
            .then(() => {
                if (active) window.location.replace('/dashboard');
            })
            .catch(requestError => {
                if (!active) return;
                if (requestError.response?.status === 401) {
                    setAuthStatus('unauthenticated');
                    return;
                }
                setError(requestError.response?.data?.message || 'Unable to verify your session. Please try again.');
                setAuthStatus('error');
            });
        return () => { active = false; };
    }, []);

    const submit = async event => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.get('/sanctum/csrf-cookie');
            const { data } = await axios.post('/api/login', form);
            if (data.requires_two_factor) {
                setTwoFactorRequired(true);
                return;
            }
            window.location.assign('/dashboard');
        } catch (requestError) {
            setError(requestError.response?.data?.errors?.email?.[0] || requestError.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const verify = async event => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post('/api/login/two-factor', { code });
            window.location.assign('/dashboard');
        } catch (requestError) {
            setError(requestError.response?.data?.errors?.code?.[0] || requestError.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    if (authStatus === 'checking') {
        return (
            <AuthLayout>
                <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500 dark:text-slate-400">
                    <LoaderCircle className="animate-spin" size={20}/>
                    Checking your session...
                </div>
            </AuthLayout>
        );
    }

    if (authStatus === 'error') {
        return (
            <AuthLayout>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to verify your session</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-6 w-full rounded-md bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Try again</button>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="mb-7 flex items-center gap-3">
                <div className="rounded-md bg-indigo-600 p-3 text-white"><LayoutDashboard size={22}/></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{twoFactorRequired ? 'Verify your identity' : 'Welcome back'}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{twoFactorRequired ? 'Enter your authenticator or recovery code.' : 'Sign in to your workspace.'}</p>
                </div>
            </div>
            <form onSubmit={twoFactorRequired ? verify : submit} className="space-y-5">
                {!twoFactorRequired ? (
                    <>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address
                            <input type="email" required autoComplete="username" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                        </label>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password
                            <input type="password" required autoComplete="current-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                        </label>
                    </>
                ) : (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Authentication code
                        <input autoFocus required autoComplete="one-time-code" inputMode="numeric" maxLength={32} value={code} onChange={event => setCode(event.target.value)} className="form-input mt-2 w-full rounded-md px-4 py-3"/>
                    </label>
                )}
                {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
                <button disabled={loading} className="w-full rounded-md bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? 'Please wait...' : twoFactorRequired ? 'Verify and sign in' : 'Sign in'}
                </button>
                {twoFactorRequired && <button type="button" onClick={() => { setTwoFactorRequired(false); setCode(''); setError(''); }} className="w-full rounded-md border border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Back to sign in</button>}
            </form>
            {!twoFactorRequired && <div className="mt-5 text-center"><a href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Forgot password?</a></div>}
        </AuthLayout>
    );
}
