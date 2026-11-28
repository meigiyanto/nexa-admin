import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import axios from 'axios';
import Alert from './Alert';

function timeAgo(value) {
    const date = new Date(value);
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
}

export default function NotificationBell({ userId, canManage = false }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const panelRef = useRef(null);

    const loadCount = async () => {
        try {
            const { data } = await axios.get('/api/notifications/unread-count');
            setUnread(data.unread_count || 0);
        } catch {
            // Keep the current badge if a background refresh fails.
        }
    };

    const loadNotifications = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get('/api/notifications');
            setItems(data.data || []);
            setUnread(data.unread_count || 0);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load notifications.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userId || !window.Echo) return undefined;

        const channel = window.Echo.private(`App.Models.User.${userId}`);
        const connection = window.Echo.connector.pusher.connection;
        const refreshAfterReconnect = () => loadCount();
        connection.bind('connected', refreshAfterReconnect);

        channel.notification(notification => {
            const item = {
                id: notification.id,
                data: notification.data || {},
                read_at: null,
                created_at: new Date().toISOString(),
            };

            setItems(current => [item, ...current.filter(existing => existing.id !== item.id)].slice(0, 10));
            loadCount();
        });

        return () => {
            connection.unbind('connected', refreshAfterReconnect);
            window.Echo.leave(`App.Models.User.${userId}`);
        };
    }, [userId]);

    useEffect(() => {
        loadCount();
    }, []);

    useEffect(() => {
        if (!open) return;
        loadNotifications();
        const closeOnOutsideClick = event => {
            if (!panelRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [open]);

    const markRead = async id => {
        try {
            await axios.patch(`/api/notifications/${id}/read`);
            setItems(current => current.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
            await loadCount();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to update notification.');
        }
    };

    const markAllRead = async () => {
        try {
            await axios.post('/api/notifications/read-all');
            setItems(current => current.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
            await loadCount();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to update notifications.');
        }
    };

    const remove = async id => {
        try {
            await axios.delete(`/api/notifications/${id}`);
            const removed = items.find(item => item.id === id);
            setItems(current => current.filter(item => item.id !== id));
            if (removed && !removed.read_at) await loadCount();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to delete notification.');
        }
    };

    const clearAll = async () => {
        try {
            await axios.delete('/api/notifications');
            setItems([]);
            await loadCount();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to clear notifications.');
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button type="button" onClick={() => setOpen(value => !value)} aria-label="Notifications" aria-expanded={open} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
                <Bell size={19}/>
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
            </button>

            {open && (
                <div className="absolute right-0 top-12 z-[70] w-[min(92vw,380px)] overflow-hidden rounded-md border bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                            <p className="text-xs text-slate-400">{unread} unread</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {unread > 0 && <button type="button" onClick={markAllRead} title="Mark all as read" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><CheckCheck size={16}/></button>}
                            {canManage && items.length > 0 && <button type="button" onClick={clearAll} title="Clear all notifications" className="rounded-md p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={16}/></button>}
                            <button type="button" onClick={() => setOpen(false)} title="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={16}/></button>
                        </div>
                    </div>
                    {error && <Alert type="error" onClose={() => setError('')} className="rounded-none border-x-0 border-t-0 px-4 py-2 text-xs">{error}</Alert>}
                    <div className="max-h-[420px] overflow-y-auto">
                        {loading ? <p className="p-8 text-center text-sm text-slate-400">Loading notifications...</p> : items.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell size={22} className="mx-auto mb-2 text-slate-300"/>
                                <p className="text-sm font-medium text-slate-600">You're all caught up</p>
                                <p className="mt-1 text-xs text-slate-400">New activity will appear here.</p>
                            </div>
                        ) : items.map(item => (
                            <div key={item.id} className={`flex gap-3 border-b px-4 py-3 last:border-0 ${item.read_at ? 'bg-white' : 'bg-indigo-50/60'}`}>
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? 'bg-transparent' : 'bg-indigo-500'}`}/>
                                <button type="button" onClick={() => !item.read_at && markRead(item.id)} className="min-w-0 flex-1 text-left">
                                    <p className="text-sm font-semibold text-slate-800">{item.data?.title || 'Notification'}</p>
                                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.data?.message}</p>
                                    <p className="mt-1 text-[11px] text-slate-400">{item.data?.actor ? `By ${item.data.actor} · ` : ''}{timeAgo(item.created_at)}</p>
                                </button>
                                <button type="button" onClick={() => remove(item.id)} title="Delete notification" className="h-8 shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-500"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                    {items.length > 0 && <div className="border-t px-4 py-2 text-center text-xs text-slate-400">Showing the latest {items.length} notifications</div>}
                </div>
            )}
        </div>
    );
}
