import React, { createContext, useContext, useState, useCallback } from 'react';
import type { NotificationItem } from '../types/notification';
import { MOCK_NOTIFICATIONS } from '../types/notification';

export interface ToastItem extends NotificationItem {
    duration?: number;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    toasts: ToastItem[];
    unreadCount: number;
    showToast: (type: NotificationItem['type'], title: string, message: string, duration?: number) => void;
    dismissToast: (id: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (type: NotificationItem['type'], title: string, message: string, duration = 4500) => {
            const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const newNotification: ToastItem = {
                id,
                title,
                message,
                type,
                timestamp: 'Just now',
                read: false,
                duration,
            };

            // 1. Show the pop-up toast on the right
            setToasts((prev) => [newNotification, ...prev]);

            // 2. Also record it in the drawer list
            setNotifications((prev) => [newNotification, ...prev]);

            // 3. Auto-dismiss after duration
            if (duration > 0) {
                setTimeout(() => {
                    dismissToast(id);
                }, duration);
            }
        },
        [dismissToast]
    );

    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                toasts,
                unreadCount,
                showToast,
                dismissToast,
                markAsRead,
                markAllAsRead,
                clearAll,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
