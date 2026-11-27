import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Languages, LoaderCircle, Save } from 'lucide-react';
import axios from 'axios';

const defaults = { locale: 'en', timezone: 'Asia/Jakarta', date_format: 'dmy' };
const timezones = [
    ['Asia/Jakarta', 'WIB — Jakarta'],
    ['Asia/Makassar', 'WITA — Makassar'],
    ['Asia/Jayapura', 'WIT — Jayapura'],
    ['Asia/Singapore', 'Singapore'],
    ['Asia/Kuala_Lumpur', 'Kuala Lumpur'],
    ['Asia/Bangkok', 'Bangkok'],
    ['Asia/Tokyo', 'Tokyo'],
    ['Asia/Seoul', 'Seoul'],
    ['Asia/Dubai', 'Dubai'],
    ['Europe/London', 'London'],
    ['Europe/Paris', 'Paris'],
    ['America/New_York', 'New York'],
    ['America/Los_Angeles', 'Los Angeles'],
    ['Australia/Sydney', 'Sydney'],
    ['UTC', 'UTC'],
];

export default function LocalizationSettings({ canEdit = false, onSaved }) {
    const [preferences, setPreferences] = useState(defaults);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const isId = preferences.locale === 'id';

    useEffect(() => {
        axios.get('/api/settings')
            .then(({ data }) => {
                const saved = { ...defaults, ...data.localization_preferences };
                setPreferences(saved);
                onSaved?.(saved);
            })
            .catch(requestError => setError(requestError.response?.data?.message || 'Unable to load localization settings.'))
            .finally(() => setLoading(false));
    }, []);

    const preview = useMemo(() => {
        const date = new Date();
        const locale = preferences.locale === 'id' ? 'id-ID' : 'en-US';
        const dateParts = new Intl.DateTimeFormat(locale, {
            timeZone: preferences.timezone,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).formatToParts(date).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
        const formattedDate = preferences.date_format === 'ymd'
            ? `${dateParts.year}-${dateParts.month}-${dateParts.day}`
            : preferences.date_format === 'mdy'
                ? `${dateParts.month}/${dateParts.day}/${dateParts.year}`
                : `${dateParts.day}/${dateParts.month}/${dateParts.year}`;
        const formattedTime = new Intl.DateTimeFormat(locale, {
            timeZone: preferences.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: preferences.locale === 'en',
        }).format(date);
        return `${formattedDate} · ${formattedTime}`;
    }, [preferences]);

    const save = async () => {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const { data } = await axios.put('/api/settings', { localization_preferences: preferences });
            const saved = data.localization_preferences;
            setPreferences(saved);
            onSaved?.(saved);
            setMessage(isId ? 'Pengaturan bahasa dan waktu berhasil disimpan.' : 'Language and regional settings saved.');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to save localization settings.');
        } finally {
            setSaving(false);
        }
    };

    const fieldClass = 'mt-2 w-full rounded-md border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800';

    return (
        <section className="rounded-md border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-6 flex items-start gap-3">
                <span className="rounded-md bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Languages size={20}/></span>
                <div>
                    <h2 className="text-xl font-bold">{isId ? 'Bahasa & Lokalisasi' : 'Language & Localization'}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isId ? 'Atur bahasa antarmuka, zona waktu, dan format tanggal dashboard.' : 'Set your dashboard language, time zone, and date format.'}</p>
                </div>
            </div>
            {loading ? <p className="py-6 text-center text-sm text-slate-400">{isId ? 'Memuat pengaturan...' : 'Loading settings...'}</p> : (
                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                        <span className="flex items-center gap-2"><Languages size={16}/>{isId ? 'Bahasa antarmuka' : 'Interface language'}</span>
                        <select className={fieldClass} value={preferences.locale} disabled={!canEdit} onChange={event => setPreferences(current => ({ ...current, locale: event.target.value }))}>
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        <span className="flex items-center gap-2"><Clock3 size={16}/>{isId ? 'Zona waktu' : 'Time zone'}</span>
                        <select className={fieldClass} value={preferences.timezone} disabled={!canEdit} onChange={event => setPreferences(current => ({ ...current, timezone: event.target.value }))}>
                            {timezones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">
                        <span className="flex items-center gap-2"><CalendarDays size={16}/>{isId ? 'Format tanggal' : 'Date format'}</span>
                        <select className={fieldClass} value={preferences.date_format} disabled={!canEdit} onChange={event => setPreferences(current => ({ ...current, date_format: event.target.value }))}>
                            <option value="dmy">DD/MM/YYYY</option>
                            <option value="mdy">MM/DD/YYYY</option>
                            <option value="ymd">YYYY-MM-DD</option>
                        </select>
                    </label>
                    <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{isId ? 'Pratinjau tanggal & waktu' : 'Date & time preview'}</p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">{preview}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{preferences.timezone}</p>
                    </div>
                </div>
            )}
            {error && <p role="alert" className="mt-5 text-sm text-rose-600">{error}</p>}
            {message && <p role="status" className="mt-5 text-sm text-emerald-600">{message}</p>}
            {canEdit && <div className="mt-6 flex justify-end border-t pt-4 dark:border-slate-700">
                <button type="button" onClick={save} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
                    {saving ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} {isId ? 'Simpan pengaturan' : 'Save settings'}
                </button>
            </div>}
            {!canEdit && <p className="mt-5 border-t pt-4 text-xs text-slate-400 dark:border-slate-700">{isId ? 'Anda dapat melihat pengaturan ini, tetapi tidak memiliki izin untuk mengubahnya.' : 'You can view these settings, but you do not have permission to change them.'}</p>}
        </section>
    );
}
