export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    type: 'success' | 'info' | 'warning' | 'error';
}

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: 'n1',
        title: 'Campaign Delivered',
        message: 'Campaign "Webinar Client Followup" sent to 1,240 subscribers successfully.',
        timestamp: '2 mins ago',
        read: false,
        type: 'success',
    },
    {
        id: 'n2',
        title: 'New Subscriber List',
        message: 'Import completed: 85 new subscribers added to "VIP Customers".',
        timestamp: '1 hour ago',
        read: false,
        type: 'info',
    },
    {
        id: 'n3',
        title: 'Bounce Alert',
        message: 'Campaign "Newsletter #12" had a bounce rate of 4.2% (higher than usual).',
        timestamp: '3 hours ago',
        read: false,
        type: 'warning',
    },
    {
        id: 'n4',
        title: 'Domain Verified',
        message: 'SPF & DKIM records for "tililtech.com" verified and active.',
        timestamp: 'Yesterday',
        read: true,
        type: 'success',
    },
];
