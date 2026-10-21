// import React from 'react';
import type { NotificationItem } from '../../types/notification';
import './NotificationDrawer.css';

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: NotificationItem[];
    onMarkAllAsRead: () => void;
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
}

export function NotificationDrawer({
    isOpen,
    onClose,
    notifications,
    onMarkAllAsRead,
    onMarkAsRead,
    onClearAll,
}: NotificationDrawerProps) {
    if (!isOpen) return null;

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <>
            {/* Dimmed backdrop */}
            <div className="notification-backdrop" onClick={onClose} aria-hidden="true" />

            {/* Slide-in panel from the right */}
            <aside className="notification-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
                <div className="notification-drawer__header">
                    <div className="notification-drawer__title-wrap">
                        <h2 className="notification-drawer__title">Notifications</h2>
                        {unreadCount > 0 && (
                            <span className="notification-drawer__badge">{unreadCount} new</span>
                        )}
                    </div>
                    <button type="button" className="notification-drawer__close" onClick={onClose} aria-label="Close notifications">
                        ✕
                    </button>
                </div>

                <div className="notification-drawer__actions">
                    {unreadCount > 0 && (
                        <button type="button" className="notification-drawer__btn-link" onClick={onMarkAllAsRead}>
                            Mark all as read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button type="button" className="notification-drawer__btn-link notification-drawer__btn-link--danger" onClick={onClearAll}>
                            Clear all
                        </button>
                    )}
                </div>

                <div className="notification-drawer__body">
                    {notifications.length === 0 ? (
                        <div className="notification-drawer__empty">
                            <span>🔔</span>
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <ul className="notification-drawer__list">
                            {notifications.map((item) => (
                                <li
                                    key={item.id}
                                    className={`notification-item notification-item--${item.type} ${item.read ? 'is-read' : 'is-unread'}`}
                                    onClick={() => onMarkAsRead(item.id)}
                                >
                                    <div className="notification-item__top">
                                        <strong className="notification-item__title">{item.title}</strong>
                                        <span className="notification-item__time">{item.timestamp}</span>
                                    </div>
                                    <p className="notification-item__msg">{item.message}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>
        </>
    );
}
