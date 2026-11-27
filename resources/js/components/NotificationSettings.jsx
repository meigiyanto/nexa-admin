import React, { useEffect, useState } from 'react';
import { Bell, LoaderCircle, Save, ShieldCheck, Users, Wrench } from 'lucide-react';
import axios from 'axios';

const getOptions = isId => [
    { key: 'user_activity', title: isId ? 'Aktivitas pengguna' : 'User activity', description: isId ? 'Akun baru, perubahan status akun, dan penghapusan pengguna.' : 'New accounts, account status changes, and user removals.', icon: Users },
    { key: 'access_changes', title: isId ? 'Perubahan akses' : 'Access changes', description: isId ? 'Penetapan role dan pembaruan permission.' : 'Role assignments and permission updates.', icon: ShieldCheck },
    { key: 'system_updates', title: isId ? 'Pembaruan sistem' : 'System updates', description: isId ? 'Pengumuman penting platform dan ruang kerja.' : 'Important platform and workspace announcements.', icon: Wrench },
];

export default function NotificationSettings({ canEdit = false, locale = 'en' }) {
    const isId = locale === 'id';
    const [preferences, setPreferences] = useState({
        user_activity: true,
        access_changes: true,
        system_updates: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get('/api/settings')
            .then(({ data }) => setPreferences(current => ({ ...current, ...data.notification_preferences })))
            .catch(requestError => setError(requestError.response?.data?.message || (isId ? 'Gagal memuat preferensi notifikasi.' : 'Unable to load notification preferences.')))
            .finally(() => setLoading(false));
    }, []);

    const toggle = key => setPreferences(current => ({ ...current, [key]: !current[key] }));

    const save = async () => {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            const { data } = await axios.put('/api/settings', { notification_preferences: preferences });
            setPreferences(data.notification_preferences);
            setMessage(isId ? 'Preferensi berhasil disimpan.' : 'Preferences saved.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || (isId ? 'Gagal menyimpan preferensi notifikasi.' : 'Unable to save notification preferences.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-md border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-6 flex items-start gap-3">
                <span className="rounded-md bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Bell size={20}/></span>
                <div>
                    <h2 className="text-xl font-bold">{isId ? 'Notifikasi' : 'Notifications'}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isId ? 'Pilih aktivitas ruang kerja yang ingin ditampilkan di kotak masuk notifikasi dan pemberitahuan langsung.' : 'Choose which workspace events appear in your notification inbox and real-time alerts.'}</p>
                </div>
            </div>
            {loading ? <p className="py-6 text-center text-sm text-slate-400">{isId ? 'Memuat preferensi...' : 'Loading preferences...'}</p> : (
                <div className="space-y-5">
                    {getOptions(isId).map(({ key, title, description, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="mt-0.5 rounded-md bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Icon size={17}/></span>
                                <div>
                                    <p className="text-sm font-semibold">{title}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                                </div>
                            </div>
                            <button type="button" role="switch" aria-label={title} aria-checked={Boolean(preferences[key])} disabled={!canEdit} onClick={() => toggle(key)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${preferences[key] ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${preferences[key] ? 'translate-x-6' : 'translate-x-1'}`}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {error && <p role="alert" className="mt-5 text-sm text-rose-600">{error}</p>}
            {message && <p role="status" className="mt-5 text-sm text-emerald-600">{message}</p>}
            {canEdit && <div className="mt-6 flex justify-end border-t pt-4 dark:border-slate-700">
                <button type="button" onClick={save} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
                    {saving ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} {isId ? 'Simpan preferensi' : 'Save preferences'}
                </button>
            </div>}
            {!canEdit && <p className="mt-5 border-t pt-4 text-xs text-slate-400 dark:border-slate-700">{isId ? 'Anda dapat melihat preferensi ini, tetapi tidak memiliki izin untuk mengubahnya.' : 'You can view these preferences, but you do not have permission to change them.'}</p>}
        </section>
    );
}
