import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Activity, Settings, Bell, Search, Menu, X, LogOut, ChevronDown, Plus, Pencil, Trash2, ArrowUpRight, ShieldCheck, CreditCard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import RolesPage from './RolesPage';
import UserAccessModal from './UserAccessModal';
import AnalyticsPage from './AnalyticsPage';

const initialForm = {
    name: '', email: '', password: '', status: 'active'
};

function Avatar({ name }) {
    const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            {initials || 'U'}
        </div>
    );
}

function Login({ onLogin }) {
    const [form, setForm] = useState({
        email: 'admin@example.com',
        password: 'password'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.get('/sanctum/csrf-cookie');
            const { data } = await axios.post('/api/login', form);
            onLogin({ ...data.user, roles: data.roles || [], permissions: data.permissions || [] });
        } catch (error) {
            setError(error.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <form onSubmit={submit} className="w-full max-w-md rounded-md border bg-white p-8 shadow-xl">
                <div className="mb-8 flex items-center gap-3">
                    <div className="rounded-md bg-indigo-600 p-3 text-white">
                        <LayoutDashboard size={24}/>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Nexa Admin</h1>
                        <p className="text-sm text-slate-500">Sign in to your workspace</p>
                    </div>
                </div>

                <label className="mb-2 block text-sm font-medium">Email address</label>
                <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="mb-5 w-full rounded-md form-input px-4 py-3"
                />

                <label className="mb-2 block text-sm font-medium">Password</label>
                <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="mb-5 w-full rounded-md form-input px-4 py-3"
                />

                {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

                <button disabled={loading} className="w-full rounded-md bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>

                <p className="mt-5 text-center text-xs text-slate-400">
                    Demo: admin@example.com / password
                </p>
            </form>
        </div>
    );
}

function Dashboard() {
    const [user, setUser] = useState(null);
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
    const [loading, setLoading] = useState(true);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const loadDashboard = async () => {
        try {
            const { data } = await axios.get('/api/dashboard');
            setStats(data.stats);
            setChart(data.chart);
            setUsers(data.recent_users);
        } catch (error) {
            setNotice(error.response?.data?.message || 'Unable to load dashboard.');
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
        axios.get('/api/user')
            .then(({ data }) => {
                setUser({ ...data.user, roles: data.roles || [], permissions: data.permissions || [] });
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
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (user && page === 'Users') {
            loadUsers().catch(() => setNotice('Unable to load users.'));
        }
    }, [user, page, search]);

    const logout = async () => {
        if (logoutLoading) return;
        setLogoutLoading(true);
        setNotice('');

        try {
            await axios.post('/api/logout');
            setUser(null);
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
                setPage('Overview');
                setStats({});
                setChart([]);
                setUsers([]);
                setMobileOpen(false);
                setModal(false);
                setAccessUser(null);
            } else {
                setNotice(error.response?.data?.message || 'Unable to sign out. Please try again.');
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
            setNotice(editing ? 'User updated.' : 'User created.');

            if (page === 'Users') {
                await loadUsers();
            } else {
                await loadDashboard();
            }
        } catch (error) {
            setNotice(error.response?.data?.message || 'Unable to save user.');
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await axios.delete(`/api/users/${id}`);
            await loadUsers();
            setNotice('User deleted successfully.');
        } catch (error) {
            setNotice(error.response?.data?.message || 'Unable to delete user.');
        }
    };

    if (!user) {
        return <Login onLogin={user => {
            setUser(user);
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
        {label: 'Total users', value: stats.total_users, icon: Users, color: 'bg-indigo-50 text-indigo-600'},
        {label: 'Active users', value: stats.active_users, icon: Activity, color: 'bg-emerald-50 text-emerald-600'},
        {label: 'New users this month', value: stats.new_users, icon: ArrowUpRight, color: 'bg-amber-50 text-amber-600'},
        {label: 'Inactive users', value: stats.inactive_users, icon: CreditCard, color: 'bg-rose-50 text-rose-600'}
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
                    {!sidebarCollapsed && <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</p>}
                    {navigation.map(({name, icon: Icon}) => (
                        <button key={name} onClick={() => {
                            setPage(name);
                            setMobileOpen(false);
                        }} title={sidebarCollapsed ? name : undefined} className={`mb-1 flex w-full items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-md py-2.5 text-sm font-medium ${page === name ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <Icon size={18}/>
                            {!sidebarCollapsed && name}
                        </button>
                    ))}
                </div>

                <div className="mt-auto p-4">
                    {!sidebarCollapsed && <div className="rounded-md bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <ShieldCheck size={17} className="text-indigo-600"/>
                            Pro workspace
                        </div>
                        <p className="text-xs leading-5 text-slate-500">Manage your workspace and team from one place.</p>
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
                            <p className="text-xs text-slate-400">Workspace / {page}</p>
                            <h1 className="text-lg font-bold">{page}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden items-center gap-2 md:flex">
                            <Search size={16} className="text-slate-400"/>
                            {/* <input className="w-36 border-0 bg-transparent p-0 text-xs focus:ring-0" placeholder="Search..."/> */}
                            <input className="form-in" placeholder="Search..."/>
                        </div>
                        <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
                            <Bell size={19}/>
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500"/>
                        </button>
                        <div className="flex items-center gap-2">
                            <Avatar name={user.name}/>
                            <div className="hidden sm:block">
                                <p className="text-xs font-semibold">{user.name}</p>
                                <p className="text-xs capitalize text-slate-400">{user.roles?.join(', ') || 'No role'}</p>
                            </div>
                            <ChevronDown size={14} className="text-slate-400"/>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1440px] p-4 md:p-8">
                    {notice && (
                        <div className="mb-5 flex items-center justify-between rounded-md bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                            {notice}
                            <button onClick={() => setNotice('')}><X size={16}/></button>
                        </div>
                    )}

                    {page === 'Overview' ? (
                        <>
                            <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Good morning, {user.name.split(' ')[0]} 👋</h2>
                                    <p className="mt-1 text-sm text-slate-500">Here's what's happening with your workspace today.</p>
                                </div>
                                {can('users.create') && <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={17}/> Add new user</button>}
                            </div>

                            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {cards.map(({label, value, icon: Icon, color}) => (
                                    <div key={label} className="rounded-md border bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-500">{label}</span>
                                            <span className={`rounded-md p-2 ${color}`}><Icon size={18}/></span>
                                        </div>
                                        <div className="mt-4 text-3xl font-bold">
                                            {loading ? '—' : Number(value || 0).toLocaleString('en-US')}
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">Current account overview</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
                                <section className="rounded-md border bg-white p-5 shadow-sm">
                                    <div className="mb-5">
                                        <h3 className="font-bold">User growth</h3>
                                        <p className="mt-1 text-xs text-slate-400">New users over the last six months</p>
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
                                    <h3 className="font-bold">User status</h3>
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
                                        <p className="mt-1 text-xs text-slate-400">Latest members in your workspace</p>
                                    </div>
                                    {can('users.view') && <button onClick={() => setPage('Users')} className="text-xs font-semibold text-indigo-600">View all users →</button>}
                                </div>
                                <UserTable users={users.slice(0, 6)} onEdit={can('users.update') ? openEdit : undefined} onManageAccess={can('users.assign-roles') || can('users.assign-permissions') ? openAccess : undefined}/>
                            </section>
                        </>
                    ) : page === 'Users' ? (
                        <>
                            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <h2 className="text-2xl font-bold">Team members</h2>
                                    <p className="mt-1 text-sm text-slate-500">Manage access and roles across your workspace.</p>
                                </div>
                                {can('users.create') && <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/> Add user</button>}
                            </div>
                            <div className="overflow-hidden rounded-md border bg-white shadow-sm">
                                <div className="border-b p-4">
                                    <div className="flex max-w-sm items-center gap-2 p-3">
                                        <Search size={16} className="text-slate-400"/>
                                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..." className="w-full border-0 text-sm focus:ring-0"/>
                                    </div>
                                </div>
                                <UserTable users={users} onEdit={can('users.update') ? openEdit : undefined} onDelete={can('users.delete') ? deleteUser : undefined} onManageAccess={can('users.assign-roles') || can('users.assign-permissions') ? openAccess : undefined}/>
                            </div>
                        </>
                    ) : page === 'Roles' ? (
                        <RolesPage permissions={user.permissions || []}/>
                    ) : page === 'Analytics' ? (
                        <AnalyticsPage canExport={can('analytics.export')}/>
                    ) : (
                        <div className="rounded-md border bg-white p-10 text-center">
                            <Settings className="mx-auto mb-3 text-slate-400"/>
                            <h2 className="font-bold">{page}</h2>
                            <p className="mt-1 text-sm text-slate-500">{page === 'No Access' ? 'Your account does not have permission to view any dashboard section.' : 'This section will be implemented in the next phase.'}</p>
                        </div>
                    )}
                </main>
            </div>

            {accessUser && <UserAccessModal user={accessUser} permissions={user.permissions || []} onClose={() => setAccessUser(null)} onSaved={async () => { setAccessUser(null); if (page === 'Users') await loadUsers(); else if (can('dashboard.view')) await loadDashboard(); setNotice('User access updated successfully.'); }}/>} 
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

function UserTable({ users, onEdit, onDelete, onManageAccess }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                        <th className="px-5 py-3">User</th>
                        <th className="px-5 py-3">Roles</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Joined</th>
                        <th className="px-5 py-3 text-right">Actions</th>
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
                            <td className="px-5 py-3 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                            <td className="px-5 py-3">
                                <div className="flex justify-end gap-1">
                                    {onManageAccess && <button onClick={() => onManageAccess(item)} title="Manage access" className="rounded-md p-2 text-indigo-600 hover:bg-indigo-50"><ShieldCheck size={15}/></button>}
                                    {onEdit && <button onClick={() => onEdit(item)} title="Edit user" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15}/></button>}
                                    {onDelete && <button onClick={() => onDelete(item.id)} title="Delete user" className="rounded-md p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15}/></button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {users.length === 0 && <p className="p-10 text-center text-sm text-slate-400">No users found.</p>}
        </div>
    );
}

export default Dashboard;
