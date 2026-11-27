import React, { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, Save, Trash2, UserRound } from 'lucide-react';
import axios from 'axios';

export default function ProfileSettings({ user, onUpdated }) {
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(user.profile_photo_url || null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setName(user.name || '');
        setEmail(user.email || '');
        setPreview(user.profile_photo_url || null);
        setPhoto(null);
        setRemovePhoto(false);
    }, [user.id, user.name, user.email, user.profile_photo_url]);

    const choosePhoto = event => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPhoto(file);
        setPreview(URL.createObjectURL(file));
        setRemovePhoto(false);
        setErrors(current => ({...current, photo: undefined}));
    };

    const submit = async event => {
        event.preventDefault();
        setSaving(true);
        setErrors({});
        setMessage('');

        const payload = new FormData();
        payload.append('name', name);
        payload.append('email', email);
        if (photo) payload.append('photo', photo);
        if (removePhoto) payload.append('remove_photo', '1');

        try {
            const { data } = await axios.post('/api/profile', payload, {
                headers: { 'Content-Type': 'multipart/form-data', 'X-HTTP-Method-Override': 'PUT' }
            });
            onUpdated?.(data.user);
            setPhoto(null);
            setRemovePhoto(false);
            setPreview(data.user.profile_photo_url || null);
            setMessage(data.message || 'Profile updated successfully.');
        } catch (error) {
            if (error.response?.status === 422) setErrors(error.response.data.errors || {});
            setMessage(error.response?.data?.message || 'Unable to update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-md border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-6"><h2 className="text-xl font-bold">Profile</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage the name, email address, and profile photo on your account.</p></div>
            <form onSubmit={submit} className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                        {preview ? <img src={preview} alt="Profile preview" className="h-full w-full object-cover"/> : <UserRound size={34}/>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} className="hidden"/>
                        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium dark:border-slate-700"><Camera size={16}/> Change photo</button>
                        {preview && <button type="button" onClick={() => { setPhoto(null); setPreview(null); setRemovePhoto(true); if (inputRef.current) inputRef.current.value = ''; }} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-rose-600 dark:border-slate-700"><Trash2 size={16}/> Remove</button>}
                        <p className="w-full text-xs text-slate-400">JPG, PNG, or WebP. Maximum file size: 2 MB.</p>
                        {errors.photo && <p className="w-full text-xs text-rose-600">{errors.photo[0]}</p>}
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">Full name
                        <input value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoComplete="name" className="mt-1.5 w-full"/>
                        {errors.name && <span className="mt-1 block text-xs text-rose-600">{errors.name[0]}</span>}
                    </label>
                    <label className="text-sm font-medium">Email address
                        <input type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={255} autoComplete="email" className="mt-1.5 w-full"/>
                        {errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email[0]}</span>}
                    </label>
                </div>
                {message && <p role="status" className={`text-sm ${Object.keys(errors).length ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</p>}
                <div className="flex justify-end border-t pt-4 dark:border-slate-700">
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} Save changes</button>
                </div>
            </form>
        </section>
    );
}
