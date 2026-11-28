import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, ShieldCheck, Save, X } from 'lucide-react';
import Alert from '../components/Alert';
import DashboardLayout from '../layouts/DashboardLayout';

export default function RolesPage({ permissions: currentPermissions = [] }) {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState([]);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const canCreate = currentPermissions.includes('roles.create');
    const canUpdate = currentPermissions.includes('roles.update');
    const canDelete = currentPermissions.includes('roles.delete');
    const canManagePermissions = currentPermissions.includes('permissions.view');

    async function loadData() {
        setLoading(true);
        try {
            const roleResponse = await axios.get('/api/roles');
            setRoles(roleResponse.data.data);
            if (canManagePermissions) {
                const permissionResponse = await axios.get('/api/permissions');
                setPermissions(permissionResponse.data.data);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Unable to load roles.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function resetForm() {
        setName('');
        setSelected([]);
        setEditing(null);
        setError('');
    }

    function togglePermission(permission) {
        setSelected(current => current.includes(permission)
            ? current.filter(item => item !== permission)
            : [...current, permission]
        );
    }

    function editRole(role) {
        setEditing(role.id);
        setName(role.name);
        setSelected(role.permissions.map(permission => permission.name));
        setError('');
    }

    async function saveRole(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = { name, permissions: selected };

            if (editing) {
                await axios.put(`/api/roles/${editing}`, payload);
            } else {
                await axios.post('/api/roles', payload);
            }

            resetForm();
            await loadData();
        } catch (error) {
            const errors = error.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : error.response?.data?.message || 'Unable to save role.');
        } finally {
            setSaving(false);
        }
    }

    async function deleteRole(role) {
        if (!window.confirm(`Delete role "${role.name}"?`)) return;

        try {
            await axios.delete(`/api/roles/${role.id}`);
            await loadData();
        } catch (error) {
            setError(error.response?.data?.message || 'Unable to delete role.');
        }
    }

    const grouped = permissions.reduce((result, permission) => {
        const group = permission.name.split('.')[0];
        result[group] ??= [];
        result[group].push(permission);
        return result;
    }, {});

    if (loading) return <div className="p-8 text-slate-500">Loading roles...</div>;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage roles and their access permissions.</p>
                    </div>
                    {canCreate && canManagePermissions && !editing && (
                        <button onClick={resetForm} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                            <Plus size={17} /> New Role
                        </button>
                    )}
                </div>
    
                {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
    
                {canManagePermissions && (canCreate || canUpdate) && (
                    <form onSubmit={saveRole} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">{editing ? 'Edit Role' : 'Create Role'}</h2>
                            {editing && <button type="button" onClick={resetForm} className="text-slate-500"><X size={18} /></button>}
                        </div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Role name</label>
                        <input value={name} onChange={event => setName(event.target.value)} required pattern="[a-z0-9_-]+" maxLength={100} disabled={editing && ['admin', 'editor', 'viewer'].includes(roles.find(role => role.id === editing)?.name)} placeholder="e.g. support" className="mb-5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                        <h3 className="mb-3 text-sm font-semibold text-slate-800">Permissions</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(grouped).map(([group, items]) => (
                                <div key={group} className="rounded-md border border-slate-200 p-3">
                                    <h4 className="mb-3 font-semibold capitalize text-slate-700">{group}</h4>
                                    <div className="space-y-2">
                                        {items.map(permission => (
                                            <label key={permission.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                                                <input type="checkbox" checked={selected.includes(permission.name)} onChange={() => togglePermission(permission.name)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                                {permission.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            {editing && <button type="button" onClick={resetForm} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>}
                            <button disabled={saving || (!editing && !canCreate) || (editing && !canUpdate)} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Role'}
                            </button>
                        </div>
                    </form>
                )}
    
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {roles.map(role => (
                        <div key={role.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md bg-indigo-50 p-2 text-indigo-600"><ShieldCheck size={20} /></div>
                                    <div>
                                        <h3 className="font-semibold capitalize text-slate-900">{role.name}</h3>
                                        <p className="text-xs text-slate-500">{role.permissions.length} permissions</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {canUpdate && canManagePermissions && role.name !== 'admin' && <button onClick={() => editRole(role)} title="Edit role" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>}
                                    {canDelete && !['admin', 'editor', 'viewer'].includes(role.name) && <button onClick={() => deleteRole(role)} title="Delete role" className="rounded-md p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {role.permissions.slice(0, 8).map(permission => (
                                    <span key={permission.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{permission.name}</span>
                                ))}
                                {role.permissions.length > 8 && <span className="px-2 py-1 text-xs text-slate-400">+{role.permissions.length - 8} more</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
