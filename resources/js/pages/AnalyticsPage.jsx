import React, { useEffect, useState } from 'react';
import { Activity, Download, Users, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import axios from 'axios';

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function AnalyticsPage({ canExport = false }) {
    const today = new Date();
    const todayString = formatDate(today);
    const initialStart = new Date(today);
    initialStart.setDate(initialStart.getDate() - 29);

    const [startDate, setStartDate] = useState(formatDate(initialStart));
    const [endDate, setEndDate] = useState(todayString);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    const loadReport = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get('/api/analytics', { params: { start_date: startDate, end_date: endDate } });
            setReport(data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load analytics report.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, []);

    const exportReport = async () => {
        setExporting(true);
        setError('');
        try {
            const response = await axios.get('/api/analytics/export', {
                params: { start_date: startDate, end_date: endDate },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'user-analytics-' + startDate + '-to-' + endDate + '.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (requestError) {
            setError('Unable to export analytics report.');
        } finally {
            setExporting(false);
        }
    };

    const cards = [
        { label: 'Registered users', value: report?.summary.total_users ?? 0, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Active accounts', value: report?.summary.active_users ?? 0, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Inactive accounts', value: report?.summary.inactive_users ?? 0, icon: UserX, color: 'bg-rose-50 text-rose-600' },
    ];

    return (
        <div>
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
                    <p className="mt-1 text-sm text-slate-500">Explore user registrations and account activity.</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs font-medium text-slate-500">From
                        <input type="date" value={startDate} max={endDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block rounded-lg border-slate-200 text-sm"/>
                    </label>
                    <label className="text-xs font-medium text-slate-500">To
                        <input type="date" value={endDate} min={startDate} max={todayString} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-lg border-slate-200 text-sm"/>
                    </label>
                    <button onClick={loadReport} disabled={loading || !startDate || !endDate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        <RefreshCw size={16}/> Apply
                    </button>
                    {canExport && <button onClick={exportReport} disabled={exporting || loading || !report} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        <Download size={16}/> {exporting ? 'Exporting...' : 'Export CSV'}
                    </button>}
                </div>
            </div>

            {error && <div className="mb-5 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                {cards.map(({ label, value, icon: Icon, color }) => (
                    <section key={label} className="rounded-xl border bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-500">{label}</span>
                            <span className={'rounded-lg p-2 ' + color}><Icon size={18}/></span>
                        </div>
                        <p className="mt-4 text-3xl font-bold">{loading ? '—' : Number(value).toLocaleString()}</p>
                        <p className="mt-2 text-xs text-slate-400">Selected date range</p>
                    </section>
                ))}
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Activity size={18}/></span>
                    <div>
                        <h3 className="font-bold">Registration trend</h3>
                        <p className="mt-1 text-xs text-slate-400">New user accounts registered each day</p>
                    </div>
                </div>
                <div className="h-80">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading report...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={report?.registrations || []}>
                                <defs>
                                    <linearGradient id="analyticsUserGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25}/>
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#eef2f7" vertical={false}/>
                                <XAxis dataKey="date" tickFormatter={value => value.slice(5)} axisLine={false} tickLine={false} minTickGap={24}/>
                                <YAxis allowDecimals={false} domain={[0, dataMax => Math.max(dataMax, 1)]} axisLine={false} tickLine={false} allowDataOverflow={false}/>
                                <Tooltip labelFormatter={value => new Date(value + 'T00:00:00').toLocaleDateString()}/>
                                <Area type="monotone" dataKey="users" name="New users" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} fill="url(#analyticsUserGradient)"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {!loading && report?.registrations?.length > 0 && report.registrations.every(item => Number(item.users) === 0) && <p className="mt-3 text-center text-sm text-slate-500">No new users registered in this period. The chart shows zero registrations for each day.</p>}
                {!loading && report?.registrations?.length === 0 && <p className="mt-3 text-center text-sm text-slate-400">No registration data is available for this period.</p>}
            </section>
        </div>
    );
}

export default AnalyticsPage;
