import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Activity, Settings, Search, Menu, X, LogOut, ChevronDown, Plus, Pencil, Trash2, ArrowUpRight, ShieldCheck, CreditCard, PanelLeftClose, PanelLeftOpen, Moon, Sun, UserRound } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import RolesPage from './RolesPage';
import UserAccessModal from './UserAccessModal';
import AnalyticsPage from './AnalyticsPage';
import ProfileSettings from './ProfileSettings';
import NotificationBell from '../components/NotificationBell';
import NotificationSettings from '../components/NotificationSettings';
import LocalizationSettings from '../components/LocalizationSettings';
import Alert from '../components/Alert';

const translations = {
    Workspace: 'Ruang kerja', Overview: 'Ringkasan', Users: 'Pengguna', Roles: 'Peran', Analytics: 'Analitik', Settings: 'Pengaturan',
    'My Profile': 'Profil Saya', 'No Access': 'Tidak Ada Akses', 'Good morning': 'Selamat pagi', 'Good afternoon': 'Selamat siang', 'Good evening': 'Selamat malam',
    "Here's what's happening with your workspace today.": 'Berikut kondisi ruang kerja Anda hari ini.', 'Add new user': 'Tambah pengguna',
    'Total users': 'Total pengguna', 'Active users': 'Pengguna aktif', 'New users this month': 'Pengguna baru bulan ini', 'Inactive users': 'Pengguna nonaktif',
    'Current account overview': 'Ringkasan akun saat ini', 'User growth': 'Pertumbuhan pengguna', 'New users over the last six months': 'Pengguna baru selama enam bulan terakhir',
    'User status': 'Status pengguna', Appearance: 'Tampilan', 'Customize how the Nexa Admin dashboard looks on this device.': 'Sesuaikan tampilan dashboard Nexa Admin pada perangkat ini.',
    'Dark mode': 'Mode gelap', 'Use a darker color scheme across the dashboard.': 'Gunakan skema warna gelap di seluruh dashboard.',
    'Your preference is saved in this browser and will remain active when you return.': 'Preferensi disimpan di browser ini dan tetap aktif saat Anda kembali.',
    User: 'Pengguna', Roles: 'Peran', Status: 'Status', Joined: 'Bergabung', Actions: 'Aksi', 'No users found.': 'Pengguna tidak ditemukan.',
    active: 'aktif', inactive: 'nonaktif', Search: 'Cari...', 'Manage access': 'Kelola akses', 'Edit user': 'Edit pengguna', 'Delete user': 'Hapus pengguna',
};

function formatUserDate(value, preferences) {
    if (!value) return '—';
    const locale = preferences.locale === 'id' ? 'id-ID' : 'en-US';
    const parts = new Intl.DateTimeFormat(locale, { timeZone: preferences.timezone, day: '2-digit', month: '2-digit', year: 'numeric' })
        .formatToParts(new Date(value)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    if (preferences.date_format === 'ymd') return `${parts.year}-${parts.month}-${parts.day}`;
    if (preferences.date_format === 'mdy') return `${parts.month}/${parts.day}/${parts.year}`;
    return `${parts.day}/${parts.month}/${parts.year}`;
}

const initialForm = {
    name: '', email: '', password: '', status: 'active'
};

function Avatar({ name, photoUrl }) {
    const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    if (photoUrl) return <img src={photoUrl} alt={name || 'Profile'} className="h-9 w-9 rounded-full border border-slate-200 object-cover"/>;

    return (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            {initials || 'U'}
        </div>
    );
}

function Login({ onLogin }) {
    const [form, setForm] = useState({ email: '', password: '' });
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async event => {
        event.preventDefault(); setLoading(true); setError('');
        try {
            await axios.get('/sanctum/csrf-cookie');
            const { data } = await axios.post('/api/login', form);
            if (data.requires_two_factor) { setTwoFactorRequired(true); return; }
            onLogin({ ...data.user, roles: data.roles || [], permissions: data.permissions || [] });
        } catch (requestError) {
            setError(requestError.response?.data?.errors?.email?.[0] || requestError.response?.data?.message || 'Login failed.');
        } finally { setLoading(false); }
    };

    const verify = async event => {
        event.preventDefault(); setLoading(true); setError('');
        try {
            const { data } = await axios.post('/api/login/two-factor', { code });
            onLogin({ ...data.user, roles: data.roles || [], permissions: data.permissions || [] });
        } catch (requestError) {
            setError(requestError.response?.data?.errors?.code?.[0] || requestError.response?.data?.message || 'Verification failed.');
        } finally { setLoading(false); }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <form onSubmit={twoFactorRequired ? verify : submit} className="w-full max-w-md rounded-md border bg-white p-8 shadow-xl">
                <div className="mb-8 flex items-center gap-3">
                    <div className="rounded-md bg-indigo-600 p-3 text-white"><LayoutDashboard size={24}/></div>
                    <div><h1 className="text-xl font-bold">Nexa Admin</h1><p className="text-sm text-slate-500">{twoFactorRequired ? 'Verify your identity' : 'Sign in to your workspace'}</p></div>
                </div>
                {!twoFactorRequired ? (
                    <>
                        <label className="mb-2 block text-sm font-medium">Email address</label>
                        <input type="email" required value={form.email} onChange={event => setForm({...form, email: event.target.value})} className="mb-5 w-full rounded-md form-input px-4 py-3"/>
                        <label className="mb-2 block text-sm font-medium">Password</label>
                        <input type="password" required value={form.password} onChange={event => setForm({...form, password: event.target.value})} className="mb-5 w-full rounded-md form-input px-4 py-3"/>
                    </>
                ) : (
                    <>
                        <p className="mb-5 text-sm text-slate-600">Enter the six-digit code from your authenticator app, or use one unused recovery code.</p>
                        <label className="mb-2 block text-sm font-medium">Authentication code</label>
                        <input autoFocus required value={code} onChange={event => setCode(event.target.value)} className="mb-5 w-full rounded-md form-input px-4 py-3" autoComplete="one-time-code"/>
                    </>
                )}
                {error && <Alert type="error" onClose={() => setError('')} className="mb-4">{error}</Alert>}
                <button disabled={loading} className="w-full rounded-md bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Please wait...' : twoFactorRequired ? 'Verify and sign in' : 'Sign in'}</button>
                {twoFactorRequired && <button type="button" onClick={() => { setTwoFactorRequired(false); setCode(''); setError(''); }} className="mt-3 w-full rounded-md border py-3 text-sm font-semibold">Back to sign in</button>}
            </form>
        </div>
    );
}
function Dashboard() {
    const [user, setUser] = useState(null);
    const [authStatus, setAuthStatus] = useState('checking');
    const [authError, setAuthError] = useState('');
    const [page, setPage] = useState('Overview');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [stats, setStats] = useState({});
    const [chart, setChart] = useState([]);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(false);
    const [accessUser, setAccessUser] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [notice, setNotice] = useState('');
    const [noticeType, setNoticeType] = useState('info');
    const [loading, setLoading] = useState(true);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [localization, setLocalization] = useState({ locale: 'en', timezone: 'Asia/Jakarta', date_format: 'dmy' });
    const tr = value => localization.locale === 'id' ? (translations[value] || value) : value;
    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('nexa-theme');
        return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        document.documentElement.lang = localization.locale === 'id' ? 'id' : 'en';
    }, [localization.locale]);

    useEffect(() => {
        if (!user) return;
        axios.get('/api/settings').then(({ data }) => setLocalization(current => ({ ...current, ...data.localization_preferences }))).catch(() => {});
    }, [user?.id]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('nexa-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const loadDashboard = async () => {
        try {
            const { data } = await axios.get('/api/dashboard');
            setStats(data.stats);
            setChart(data.chart);
            setUsers(data.recent_users);
        } catch (error) {
            setNoticeType('error'); setNotice(error.response?.data?.message || 'Unable to load dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        const { data } = await axios.get('/api/users', {
            params: { search }
        });

        setUsers(data.data || []);
    };

    useEffect(() => {
        let active = true;

        axios.get('/api/user')
            .then(({ data }) => {
                if (!active) return;

                setUser({ ...data.user, roles: data.roles || [], permissions: data.permissions || [] });
                setAuthStatus('authenticated');

                if ((data.permissions || []).includes('dashboard.view')) {
                    loadDashboard();
                } else {
                    const availablePage = ['Users', 'Roles', 'Analytics'].find((page, index) => {
                        const permission = ['users.view', 'roles.view', 'analytics.view'][index];
                        return (data.permissions || []).includes(permission);
                    });
                    setPage(availablePage || 'No Access');
                    setLoading(false);
                }
            })
            .catch(error => {
                if (!active) return;

                if (error.response?.status === 401) {
                    setAuthStatus('unauthenticated');
                    return;
                }

                setAuthError(error.response?.data?.message || 'Unable to verify your session. Please try again.');
                setAuthStatus('error');
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (user && page === 'Users') {
            loadUsers().catch(() => { setNoticeType('error'); setNotice('Unable to load users.'); });
        }
    }, [user, page, search]);

    const logout = async () => {
        if (logoutLoading) return;
        setLogoutLoading(true);
        setNotice('');

        try {
            await axios.post('/api/logout');
            setUser(null);
            setAuthStatus('unauthenticated');
            setPage('Overview');
            setStats({});
            setChart([]);
            setUsers([]);
            setMobileOpen(false);
            setModal(false);
            setAccessUser(null);
        } catch (error) {
            if (error.response?.status === 401) {
                // The server already considers this browser unauthenticated.
                setUser(null);
                setAuthStatus('unauthenticated');
                setPage('Overview');
                setStats({});
                setChart([]);
                setUsers([]);
                setMobileOpen(false);
                setModal(false);
                setAccessUser(null);
            } else {
                setNoticeType('error'); setNotice(error.response?.data?.message || 'Unable to sign out. Please try again.');
            }
        } finally {
            setLogoutLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({...initialForm, password: ''});
        setModal(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setForm({
            name: item.name,
            email: item.email,
            password: '',
            status: item.status
        });
        setModal(true);
    };

    const openAccess = (item) => setAccessUser(item);

    const saveUser = async (e) => {
        e.preventDefault();

        try {
            const payload = {...form};

            if (editing && !payload.password) {
                delete payload.password;
            }

            if (editing) {
                await axios.put(`/api/users/${editing.id}`, payload);
            } else {
                await axios.post('/api/users', payload);
            }

            setModal(false);
            setNoticeType('success'); setNotice(editing ? 'User updated.' : 'User created.');

            if (page === 'Users') {
                await loadUsers();
            } else {
                await loadDashboard();
            }
        } catch (error) {
            setNoticeType('error'); setNotice(error.response?.data?.message || 'Unable to save user.');
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await axios.delete(`/api/users/${id}`);
            await loadUsers();
            setNoticeType('success'); setNotice('User deleted successfully.');
        } catch (error) {
            setNoticeType('error'); setNotice(error.response?.data?.message || 'Unable to delete user.');
        }
    };

    if (authStatus === 'checking') {
        return (
            <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <div className="flex items-center gap-3 text-sm">
                    <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"/>
                    Restoring your session...
                </div>
            </div>
        );
    }

    if (authStatus === 'error') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
                <div className="w-full max-w-md rounded-md border bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Unable to verify your session</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{authError}</p>
                    <button onClick={() => window.location.reload()} className="mt-6 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (authStatus === 'unauthenticated') {
        return <Login onLogin={user => {
            setUser(user);
            setAuthStatus('authenticated');
            if (user.permissions?.includes('dashboard.view')) {
                loadDashboard();
            } else {
                const availablePage = ['Users', 'Roles', 'Analytics'].find((page, index) => {
                    const permission = ['users.view', 'roles.view', 'analytics.view'][index];
                    return user.permissions?.includes(permission);
                });
                setPage(availablePage || 'No Access');
                setLoading(false);
            }
        }}/>;
    }

    const can = permission => user.permissions?.includes(permission) || false;
    const navigation = [
        {name: 'Overview', icon: LayoutDashboard, permission: 'dashboard.view'},
        {name: 'Users', icon: Users, permission: 'users.view'},
        {name: 'Roles', icon: ShieldCheck, permission: 'roles.view'},
        {name: 'Analytics', icon: Activity, permission: 'analytics.view'},
        {name: 'Settings', icon: Settings, permission: 'settings.view'}
    ].filter(item => can(item.permission));

    const cards = [
        {label: tr('Total users'), value: stats.total_users, icon: Users, color: 'bg-indigo-50 text-indigo-600'},
        {label: tr('Active users'), value: stats.active_users, icon: Activity, color: 'bg-emerald-50 text-emerald-600'},
        {label: tr('New users this month'), value: stats.new_users, icon: ArrowUpRight, color: 'bg-amber-50 text-amber-600'},
        {label: tr('Inactive users'), value: stats.inactive_users, icon: CreditCard, color: 'bg-rose-50 text-rose-600'}
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {mobileOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}/>
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex ${sidebarCollapsed ? 'w-20' : 'w-64'} flex-col border-r bg-white transition-all duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`flex h-[76px] items-center border-b ${sidebarCollapsed ? 'justify-center px-3' : 'justify-between px-6'}`}>
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-indigo-600 p-2.5 text-white">
                            <LayoutDashboard size={20}/>
                        </div>
                        {!sidebarCollapsed && <span className="text-xl font-extrabold">nexa<span className="text-indigo-600">.</span></span>}
                    </div>
                    <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X/></button>
                </div>

                <div className="px-4 pt-7">
                    {!sidebarCollapsed && <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">{tr('Workspace')}</p>}
                    {navigation.map(({name, icon: Icon}) => (
                        <button key={name} onClick={() => {
                            setPage(name);
                            setMobileOpen(false);
                        }} title={sidebarCollapsed ? name : undefined} className={`mb-1 flex w-full items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-md py-2.5 text-sm font-medium ${page === name ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <Icon size={18}/>
                            {!sidebarCollapsed && tr(name)}
                        </button>
                    ))}
                </div>

                <div className="mt-auto p-4">
                    {!sidebarCollapsed && <div className="rounded-md bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <ShieldCheck size={17} className="text-indigo-600"/>
                            Pro workspace
                        </div>
                        <p className="text-xs leading-5 text-slate-500">{localization.locale === 'id' ? 'Kelola ruang kerja dan tim Anda dari satu tempat.' : 'Manage your workspace and team from one place.'}</p>
                    </div>}
                    <button onClick={logout} disabled={logoutLoading} title={sidebarCollapsed ? 'Sign out' : undefined} className={`mt-4 flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} rounded-md py-2.5 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50`}>
                        <LogOut size={18}/>{!sidebarCollapsed && (logoutLoading ? 'Signing out...' : 'Sign out')}
                    </button>
                </div>
            </aside>

            <div className={`transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:px-8">
                    <div className="flex items-center gap-3">
                        <button className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:inline-flex" onClick={() => setSidebarCollapsed(value => !value)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{sidebarCollapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button>
                        <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}><Menu/></button>
                        <div>
                            <p className="text-xs text-slate-400">{tr('Workspace')} / {page}</p>
                            <h1 className="text-lg font-bold">{tr(page)}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden items-center gap-2 md:flex">
                            <Search size={16} className="text-slate-400"/>
                            {/* <input className="w-36 border-0 bg-transparent p-0 text-xs focus:ring-0" placeholder={tr('Search')}/> */}
                            <input className="form-in" placeholder="Search..."/>
                        </div>
                        <button type="button" onClick={() => setDarkMode(value => !value)} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                            {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
                        </button>
                        {can('notifications.view') && <NotificationBell userId={user.id} canManage={can('notifications.manage')}/>}
                        <div className="relative">
                            <button type="button" onClick={() => setProfileMenuOpen(value => !value)} aria-expanded={profileMenuOpen} aria-haspopup="menu" className="flex items-center gap-2 rounded-md p-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Avatar name={user.name} photoUrl={user.profile_photo_url}/>
                                <div className="hidden sm:block">
                                    <p className="text-xs font-semibold">{user.name}</p>
                                    <p className="text-xs capitalize text-slate-400">{user.roles?.join(', ') || 'No role'}</p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}/>
                            </button>
                            {profileMenuOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                <div className="border-b px-4 py-3 dark:border-slate-700">
                                    <p className="truncate text-sm font-semibold">{user.name}</p>
                                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                                </div>
                                <button type="button" role="menuitem" onClick={() => { setPage('My Profile'); setProfileMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <UserRound size={16}/> {tr('My Profile')}
                                </button>
                            </div>}
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1440px] p-4 md:p-8">
                    {notice && <Alert type={noticeType} onClose={() => setNotice('')} className="mb-5">{notice}</Alert>}

                    {page === 'Overview' ? (
                        <>
                            <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">{tr((() => { const hour = Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hourCycle: 'h23', timeZone: localization.timezone }).format(new Date())); return hour < 5 ? 'Good night' : hour < 11 ? 'Good morning' : hour < 15 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'; })())}, {user.name.split(' ')[0]} 👋</h2>
                                    <p className="mt-1 text-sm text-slate-500">{tr("Here's what's happening with your workspace today.")}</p>
                                </div>
                                {can('users.create') && <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={17}/> {tr('Add new user')}</button>}
                            </div>

                            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {cards.map(({label, value, icon: Icon, color}) => (
                                    <div key={label} className="rounded-md border bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-500">{label}</span>
                                            <span className={`rounded-md p-2 ${color}`}><Icon size={18}/></span>
                                        </div>
                                        <div className="mt-4 text-3xl font-bold">
                                            {loading ? '—' : Number(value || 0).toLocaleString(localization.locale === 'id' ? 'id-ID' : 'en-US')}
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">{tr('Current account overview')}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
                                <section className="rounded-md border bg-white p-5 shadow-sm">
                                    <div className="mb-5">
                                        <h3 className="font-bold">{tr('User growth')}</h3>
                                        <p className="mt-1 text-xs text-slate-400">{tr('New users over the last six months')}</p>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chart}>
                                                <defs>
                                                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25}/>
                                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid stroke="#eef2f7" vertical={false}/>
                                                <XAxis dataKey="month" axisLine={false} tickLine={false}/>
                                                <YAxis axisLine={false} tickLine={false}/>
                                                <Tooltip/>
                                                <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} fill="url(#userGradient)"/>
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>

                                <section className="rounded-md border bg-white p-5 shadow-sm">
                                    <h3 className="font-bold">{tr('User status')}</h3>
                                    <p className="mt-1 text-xs text-slate-400">Current account overview</p>
                                    <div className="flex justify-center py-8">
                                        <div className="flex h-40 w-40 items-center justify-center rounded-full" style={{
                                            background: `conic-gradient(#6366f1 0 ${stats.total_users ? stats.active_users / stats.total_users * 100 : 0}%, #e2e8f0 0 100%)`
                                        }}>
                                            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                                                <span className="text-3xl font-bold">{stats.total_users ? Math.round(stats.active_users / stats.total_users * 100) : 0}%</span>
                                                <span className="text-xs text-slate-400">Active</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Active users</span>
                                        <b>{stats.active_users || 0}</b>
                                    </div>
                                    <div className="mt-3 flex justify-between text-sm">
                                        <span className="text-slate-500">Inactive users</span>
                                        <b>{stats.inactive_users || 0}</b>
                                    </div>
                                </section>
                            </div>

                            <section className="overflow-hidden rounded-md border bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b px-5 py-4">
                                    <div>
                                        <h3 className="font-bold">Recent users</h3>
                                        <p className="mt-1 text-xs text-slate-400">{localization.locale === 'id' ? 'Anggota terbaru di ruang kerja Anda' : 'Latest members in your workspace'}</p>
                                    </div>
                                    {can('users.view') && <button onClick={() => setPage('Users')} className="text-xs font-semibold text-indigo-600">{localization.locale === 'id' ? 'Lihat semua pengguna' : 'View all users'} →</button>}
                                </div>
                                <UserTable users={users.slice(0, 6)} localization={localization} tr={tr} onEdit={can('users.update') ? openEdit : undefined} onManageAccess={can('users.assign-roles') || can('users.assign-permissions') ? openAccess : undefined}/>
                            </section>
                        </>
                    ) : page === 'Users' ? (
                        <>
                            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <h2 className="text-2xl font-bold">{localization.locale === 'id' ? 'Anggota tim' : 'Team members'}</h2>
                                    <p className="mt-1 text-sm text-slate-500">{localization.locale === 'id' ? 'Kelola akses dan peran di ruang kerja Anda.' : 'Manage access and roles across your workspace.'}</p>
                                </div>
                                {can('users.create') && <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/> {localization.locale === 'id' ? 'Tambah pengguna' : 'Add user'}</button>}
                            </div>
                            <div className="overflow-hidden rounded-md border bg-white shadow-sm">
                                <div className="border-b p-4">
                                    <div className="flex max-w-sm items-center gap-2 p-3">
                                        <Search size={16} className="text-slate-400"/>
                                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={localization.locale === 'id' ? 'Cari nama atau email...' : 'Search name or email...'} className="w-full border-0 text-sm focus:ring-0"/>
                                    </div>
                                </div>
                                <UserTable users={users} localization={localization} tr={tr} onEdit={can('users.update') ? openEdit : undefined} onDelete={can('users.delete') ? deleteUser : undefined} onManageAccess={can('users.assign-roles') || can('users.assign-permissions') ? openAccess : undefined}/>
                            </div>
                        </>
                    ) : page === 'Roles' ? (
                        <RolesPage permissions={user.permissions || []}/>
                    ) : page === 'Analytics' ? (
                        <AnalyticsPage canExport={can('analytics.export')}/>
                    ) : page === 'Settings' ? (
                        <div className="max-w-3xl space-y-6">
                            <section className="rounded-md border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold">{tr('Appearance')}</h2>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr('Customize how the Nexa Admin dashboard looks on this device.')}</p>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-md bg-slate-100 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{darkMode ? <Moon size={20}/> : <Sun size={20}/>}</span>
                                        <div>
                                            <p className="text-sm font-semibold">{tr('Dark mode')}</p>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr('Use a darker color scheme across the dashboard.')}</p>
                                        </div>
                                    </div>
                                    <button type="button" role="switch" aria-checked={darkMode} onClick={() => setDarkMode(value => !value)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}/>
                                    </button>
                                </div>
                                <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">{tr('Your preference is saved in this browser and will remain active when you return.')}</p>
                            </section>
                            <NotificationSettings canEdit={can('settings.update')} locale={localization.locale}/>
                            <LocalizationSettings canEdit={can('settings.update')} onSaved={setLocalization}/>
                        </div>
                    ) : page === 'My Profile' ? (
                        <div className="max-w-3xl space-y-5">
                            <div>
                                <h2 className="text-xl font-bold">My Profile</h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your personal information and account password.</p>
                            </div>
                            <ProfileSettings user={user} onUpdated={updatedUser => setUser(current => ({...current, ...updatedUser}))}/>
                        </div>
                    ) : (
                        <div className="rounded-md border bg-white p-10 text-center">
                            <Settings className="mx-auto mb-3 text-slate-400"/>
                            <h2 className="font-bold">{page}</h2>
                            <p className="mt-1 text-sm text-slate-500">{page === 'No Access' ? 'Your account does not have permission to view any dashboard section.' : 'This section will be implemented in the next phase.'}</p>
                        </div>
                    )}
                </main>
            </div>

            {accessUser && <UserAccessModal user={accessUser} permissions={user.permissions || []} onClose={() => setAccessUser(null)} onSaved={async () => { setAccessUser(null); if (page === 'Users') await loadUsers(); else if (can('dashboard.view')) await loadDashboard(); setNoticeType('success'); setNotice('User access updated successfully.'); }}/>} 
            {modal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
                    <form onSubmit={saveUser} className="w-full max-w-lg rounded-md bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-bold">{editing ? 'Edit user' : 'Add new user'}</h3>
                            <button type="button" onClick={() => setModal(false)}><X size={19}/></button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-medium">Full name
                                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1.5 w-full rounded-md border-slate-200 text-sm"/>
                            </label>
                            <label className="text-sm font-medium">Email address
                                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1.5 w-full rounded-md border-slate-200 text-sm"/>
                            </label>
                            <label className="text-sm font-medium">Password
                                <input type="password" required={!editing} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="mt-1.5 w-full rounded-md border-slate-200 text-sm" placeholder={editing ? 'Leave blank to keep current' : ''}/>
                            </label>
                            <label className="text-sm font-medium sm:col-span-2">Status
                                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="mt-1.5 w-full rounded-md border-slate-200 text-sm">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setModal(false)} className="rounded-md border px-4 py-2 text-sm font-semibold">Cancel</button>
                            <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save user</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function UserTable({ users, localization, tr, onEdit, onDelete, onManageAccess }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                        <th className="px-5 py-3">{tr('User')}</th>
                        <th className="px-5 py-3">{tr('Roles')}</th>
                        <th className="px-5 py-3">{tr('Status')}</th>
                        <th className="px-5 py-3">{tr('Joined')}</th>
                        <th className="px-5 py-3 text-right">{tr('Actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <Avatar name={item.name}/>
                                    <div>
                                        <p className="font-semibold text-slate-700">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-3 capitalize text-slate-500">{item.roles?.join(', ') || '—'}</td>
                            <td className="px-5 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-400">{formatUserDate(item.created_at, localization)}</td>
                            <td className="px-5 py-3">
                                <div className="flex justify-end gap-1">
                                    {onManageAccess && <button onClick={() => onManageAccess(item)} title={tr('Manage access')} className="rounded-md p-2 text-indigo-600 hover:bg-indigo-50"><ShieldCheck size={15}/></button>}
                                    {onEdit && <button onClick={() => onEdit(item)} title={tr('Edit user')} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15}/></button>}
                                    {onDelete && <button onClick={() => onDelete(item.id)} title={tr('Delete user')} className="rounded-md p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15}/></button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {users.length === 0 && <p className="p-10 text-center text-sm text-slate-400">{tr('No users found.')}</p>}
        </div>
    );
}

export default Dashboard;
