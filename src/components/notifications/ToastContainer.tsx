// import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import './ToastContainer.css';

export function ToastContainer() {
    const { toasts, dismissToast } = useNotification();

    if (toasts.length === 0) return null;

    const ICONS = {
        success: '✓',
        info: 'ℹ',
        warning: '⚠',
        error: '✕',
    };

    return (
        <div className="toast-container" role="region" aria-label="Notifications">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast-card toast-card--${toast.type}`}>
                    <div className="toast-card__icon" aria-hidden="true">
                        {ICONS[toast.type]}
                    </div>
                    <div className="toast-card__content">
                        <strong className="toast-card__title">{toast.title}</strong>
                        <p className="toast-card__msg">{toast.message}</p>
                    </div>
                    <button
                        type="button"
                        className="toast-card__close"
                        onClick={() => dismissToast(toast.id)}
                        aria-label="Dismiss notification"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
