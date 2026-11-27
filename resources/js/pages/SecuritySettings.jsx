import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Alert from '../components/Alert';

export default function SecuritySettings({ user }) {
    const [sessions, setSessions] = useState([]);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [secret, setSecret] = useState('');
    const [setupExpiresIn, setSetupExpiresIn] = useState(10);
    const [enabled, setEnabled] = useState(Boolean(user.two_factor_enabled));
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [copyStatus, setCopyStatus] = useState('');
    const [recoveryCopyStatus, setRecoveryCopyStatus] = useState('');
    const load = async () => {
        try { setSessions((await axios.get('/api/security/sessions')).data.sessions || []); }
        catch (e) { setSessionError(e.response?.data?.message || 'Unable to load sessions.'); }
    };
    useEffect(() => { load(); }, []);

    const copyText = async value => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return;
        }
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(input);
        if (!copied) throw new Error('Clipboard copy was rejected.');
    };
    const copySetupKey = async () => {
        setCopyStatus('');
        try {
            await copyText(secret);
            setCopyStatus('Setup key copied!');
        } catch (e) {
            setCopyStatus('Copy failed. Select the setup key and copy it manually.');
        }
    };
    const copyRecoveryCodes = async () => {
        setRecoveryCopyStatus('');
        try {
            await copyText(recoveryCodes.join('\n'));
            setRecoveryCopyStatus('Recovery codes copied!');
        } catch (e) {
            setRecoveryCopyStatus('Copy failed. Select the recovery codes and copy them manually.');
        }
    };
    const start = async e => {
        e.preventDefault(); setError(''); setMessage(''); setCopyStatus('');
        try { const data = (await axios.post('/api/security/two-factor/setup', { current_password: password })).data; setSecret(data.secret); setSetupExpiresIn(data.expires_in_minutes || 10); setPassword(''); }
        catch (e) { setError(e.response?.data?.message || 'Unable to start setup.'); }
    };
    const enable = async e => {
        e.preventDefault(); setError('');
        try {
            const data = (await axios.post('/api/security/two-factor/enable', { code })).data;
            setEnabled(true); setSecret(''); setCode(''); setRecoveryCodes(data.recovery_codes || []); setMessage(data.message);
        } catch (e) { setError(e.response?.data?.errors?.code?.[0] || e.response?.data?.message || 'Invalid code.'); }
    };
    const regenerate = async () => {
        setError('');
        try {
            const data = (await axios.post('/api/security/two-factor/recovery-codes', { current_password: password, code })).data;
            setRecoveryCodes(data.recovery_codes || []); setPassword(''); setCode(''); setMessage(data.message);
        } catch (e) { setError(e.response?.data?.errors?.code?.[0] || e.response?.data?.message || 'Unable to regenerate recovery codes.'); }
    };
    const disable = async e => {
        e.preventDefault(); setError('');
        try {
            const data = (await axios.delete('/api/security/two-factor', { data: { current_password: password, code } })).data;
            setEnabled(false); setPassword(''); setCode(''); setRecoveryCodes([]); setMessage(data.message);
        } catch (e) { setError(e.response?.data?.errors?.code?.[0] || e.response?.data?.message || 'Unable to disable 2FA.'); }
    };
    const revoke = async (key, isCurrent) => {
        setSessionError(''); setSessionMessage('');
        if (!password) { setSessionError('Enter your current password first.'); return; }
        try {
            await axios.delete('/api/security/sessions/'+key, { data: { current_password: password } });
            if (isCurrent) { window.location.reload(); return; }
            setPassword(''); await load(); setSessionMessage('Session revoked.');
        } catch (e) { setSessionError(e.response?.data?.message || 'Unable to revoke session.'); }
    };
    const revokeOthers = async () => {
        setSessionError(''); setSessionMessage('');
        if (!password) { setSessionError('Enter your current password first.'); return; }
        try {
            const data = (await axios.post('/api/security/sessions/revoke-others', { current_password: password })).data;
            setPassword(''); await load(); setSessionMessage(data.revoked+' other session(s) revoked.');
        } catch (e) { setSessionError(e.response?.data?.message || 'Unable to revoke sessions.'); }
    };

    return (
        <div className="space-y-6">
            <section className="rounded-md border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-xl font-bold">Active sessions</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Review and revoke browsers signed in to your account.
                </p>
                <label className="mt-4 block text-sm font-medium">Current password
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 w-full" autoComplete="current-password" />
                </label>
                <button type="button" onClick={revokeOthers} className="mt-3 rounded-md border px-3 py-2 text-sm font-semibold dark:border-slate-700">End all other sessions</button>
            
                <div className="mt-4 divide-y dark:divide-slate-700">
                    {sessions.map(s => <div key={s.key} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                            <p className="break-all text-sm font-medium">
                                {s.user_agent} {s.is_current && <span className="text-emerald-600">(This device)</span>}
                            </p>
                            <p className="text-xs text-slate-500">
                                {s.ip_address || 'Unknown IP'} · {new Date(s.last_activity).toLocaleString()}
                            </p>
                        </div>
                        <button type="button" onClick={() => revoke(s.key, s.is_current)} className="self-start rounded-md border px-3 py-2 text-xs text-rose-600 dark:border-slate-700">Revoke</button>
                    </div>
                    )}
                    
                    {!sessions.length && 
                        <p className="py-4 text-sm text-slate-400">
                            No active sessions found.
                        </p>
                    }
                </div>
            </section>
            
            <section className="rounded-md border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-xl font-bold">Two-factor authentication</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Use a TOTP authenticator app as an additional sign-in step.
                </p>
                <p className="mt-3 text-sm">
                    {enabled ? 'Two-factor authentication is enabled.': 'Two-factor authentication is disabled.'}
                </p>
            
                {message && <Alert type="success" onClose={() => setMessage('')}>{message}</Alert>}
                
                {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
            
                {!enabled && !secret && 
                    <form onSubmit={start} className="mt-4 space-y-3">
                        <label className="block text-sm font-medium">Current password
                            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 w-full" />
                        </label>
                        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Set up authenticator</button>
                    </form>
                }
            
                {secret && 
                    <form onSubmit={enable} className="mt-4 space-y-3">
                        <p className="text-sm">
                            Add this key manually in your authenticator app for {user.email}. This setup expires in {setupExpiresIn} minutes.
                        </p>
                        <code className="block break-all rounded bg-slate-100 p-3 dark:bg-slate-800">{secret}</code>
                        <div className="flex flex-wrap items-center gap-3">
                            <button type="button" onClick={copySetupKey} className="text-sm font-semibold text-indigo-600 underline dark:text-indigo-400">{copyStatus === 'Setup key copied!' ? 'Copied!' : 'Copy setup key'}</button>
                            {copyStatus && <span role="status" aria-live="polite" className={copyStatus === 'Setup key copied!' ? 'text-sm text-emerald-600' : 'text-sm text-rose-600'}>{copyStatus}</span>}
                        </div>
                        <label className="block text-sm font-medium">Six-digit authenticator code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} className="mt-1.5 w-full" /></label>
                        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Verify and enable</button>
                    </form>
                }
                
                {enabled && 
                    <form onSubmit={disable} className="mt-4 space-y-3">
                        <label className="block text-sm font-medium">Current password
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 w-full" required />
                        </label>
                        <label className="block text-sm font-medium">Authenticator or recovery code
                            <input required value={code} onChange={e => setCode(e.target.value)} className="mt-1.5 w-full sm:max-w-sm" />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button className="rounded-md border px-4 py-2 text-sm font-semibold text-rose-600 dark:border-slate-700">Disable 2FA</button><button type="button" onClick={regenerate} disabled={!password || !/^\d{6}$/.test(code)} className="rounded-md border px-4 py-2 text-sm font-semibold dark:border-slate-700">Regenerate recovery codes</button>
                        </div>
                    </form>
                }
                
                {recoveryCodes.length > 0 && 
                    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4">
                        <p className="font-semibold">Save these recovery codes. They are shown only once.</p>
                        <div className="my-3 grid grid-cols-2 gap-2 font-mono text-sm">
                            {recoveryCodes.map(c => <code key={c}>{c}</code>)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button type="button" onClick={copyRecoveryCodes} className="text-sm underline">{recoveryCopyStatus === 'Recovery codes copied!' ? 'Copied!' : 'Copy recovery codes'}</button>
                            {recoveryCopyStatus && <span role="status" aria-live="polite" className={recoveryCopyStatus === 'Recovery codes copied!' ? 'text-sm text-emerald-600' : 'text-sm text-rose-600'}>{recoveryCopyStatus}</span>}
                        </div>
                    </div>
                }
            </section>
        </div>
    );
}
