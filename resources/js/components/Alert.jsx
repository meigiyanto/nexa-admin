import React from 'react';
import { X } from 'lucide-react';

const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
};

export default function Alert({ type = 'info', onClose, children, className = '' }) {
    return (
        <div role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={`flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${styles[type] || styles.info} ${className}`}>
            <div className="min-w-0 flex-1">{children}</div>
            {onClose && <button type="button" onClick={onClose} aria-label="Dismiss alert"
                className="shrink-0 rounded p-1 font-semibold opacity-75 transition hover:bg-black/5 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current dark:hover:bg-white/10"><X size={16}/></button>}
        </div>
    );
}
