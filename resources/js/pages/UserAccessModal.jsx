import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, X, Save } from 'lucide-react';
import Alert from '../components/Alert';

export default function UserAccessModal({ user, permissions: actorPermissions = [], onClose, onSaved }) {
    const [roles, setRoles] = useState([]);
    const [permissionCatalog, setPermissionCatalog] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const canAssignRoles = actorPermissions.includes('users.assign-roles');
    const canAssignPermissions = actorPermissions.includes('users.assign-permissions');
    const canAssignAdmin = actorPermissions.includes('users.assign-admin-role');

    useEffect(() => {
        async function loadAccess() {
            try {
                const { data } = await axios.get(`/api/users/${user.id}/access`);

                setSelectedRoles(data.roles || []);
                setSelectedPermissions(data.direct_permissions || []);
                setRoles(data.available_roles || []);
                setPermissionCatalog(data.available_permissions || []);
            } catch (requestError) {
                setError(requestError.response?.data?.message || 'Unable to load user access.');
            } finally {
                setLoading(false);
            }
        }

        loadAccess();
    }, [user.id, canAssignRoles, canAssignPermissions]);

    function toggleValue(value, values, setter) {
        setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
    }

    async function saveAccess() {
        setSaving(true);
        setError('');

        try {
            if (canAssignRoles) {
                await axios.put(`/api/users/${user.id}/roles`, { roles: selectedRoles });
            }

            if (canAssignPermissions) {
                await axios.put(`/api/users/${user.id}/permissions`, { permissions: selectedPermissions });
            }

            await onSaved();
        } catch (requestError) {
            setError(requestError.response?.data?.message || Object.values(requestError.response?.data?.errors || {}).flat().join(' ') || 'Unable to update user access.');
        } finally {
            setSaving(false);
        }
    }

    const groupedPermissions = permissionCatalog.reduce((groups, permission) => {
        const group = permission.name.split('.')[0];
        groups[group] ??= [];
        groups[group].push(permission);
        return groups;
    }, {});

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
            <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-md bg-white shadow-2xl">
                <header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="rounded-md bg-indigo-50 p-2 text-indigo-600"><ShieldCheck size={20}/></span>
                        <div>
                            <h2 className="font-bold text-slate-900">Manage access</h2>
                            <p className="text-xs text-slate-500">{user.name} · {user.email}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button>
                </header>

                <div className="space-y-6 p-6">
                    {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
                    {loading ? <p className="text-sm text-slate-500">Loading access settings...</p> : (
                        <>
                            {canAssignRoles && (
                                <section>
                                    <h3 className="mb-1 font-semibold text-slate-900">Roles</h3>
                                    <p className="mb-3 text-xs text-slate-500">A user can have multiple roles. Their permissions are combined.</p>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {roles.map(role => (
                                            <label key={role.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm capitalize text-slate-700">
                                                <input type="checkbox" disabled={(role.name === 'admin' && !canAssignAdmin) || (selectedRoles.includes(role.name) && selectedRoles.length === 1)} checked={selectedRoles.includes(role.name)} onChange={() => toggleValue(role.name, selectedRoles, setSelectedRoles)} className="rounded border-slate-300 text-indigo-600"/>
                                                {role.name}
                                                {role.name === 'admin' && !canAssignAdmin && <span className="ml-auto text-xs text-slate-400">Restricted</span>}
                                            </label>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {canAssignPermissions && (
                                <section>
                                    <h3 className="mb-1 font-semibold text-slate-900">Direct permissions</h3>
                                    <p className="mb-3 text-xs text-slate-500">These permissions are added directly to this user, independently of their roles.</p>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {Object.entries(groupedPermissions).map(([group, items]) => (
                                            <div key={group} className="rounded-md border border-slate-200 p-3">
                                                <h4 className="mb-2 text-sm font-semibold capitalize text-slate-700">{group}</h4>
                                                <div className="space-y-2">
                                                    {items.map(permission => {
                                                        const restricted = permission.name === 'users.assign-admin-role' && !canAssignAdmin && !selectedPermissions.includes(permission.name);
                                                        return (
                                                            <label key={permission.id} className={`flex items-center gap-2 text-xs ${restricted ? 'cursor-not-allowed text-slate-300' : 'cursor-pointer text-slate-600'}`}>
                                                                <input type="checkbox" disabled={restricted} checked={selectedPermissions.includes(permission.name)} onChange={() => toggleValue(permission.name, selectedPermissions, setSelectedPermissions)} className="rounded border-slate-300 text-indigo-600"/>
                                                                {permission.name}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>

                <footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                    <button type="button" disabled={loading || saving || (!canAssignRoles && !canAssignPermissions)} onClick={saveAccess} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        <Save size={16}/>{saving ? 'Saving...' : 'Save access'}
                    </button>
                </footer>
            </section>
        </div>
    );
}
