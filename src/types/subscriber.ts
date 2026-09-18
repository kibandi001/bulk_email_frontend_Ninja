// 1. Subscriber Group
export interface SubscriberGroup {
    id: number;
    name: string;
    description?: string;
    num_subscribers?: number;
    created_at?: string;
    updated_at?: string;
}

// 2. Individual Subscriber (as returned in lists & detail)
export interface Subscriber {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    is_subscribed: boolean;
    is_blacklisted: boolean;
    created_at?: string;
    group_id?: number;
    group_name?: string;
    groups?: number[]; // Present in single-subscriber detail view
}

// 3. Paginated Response (matches DRF limit/offset)
export interface PaginatedSubscribersResponse {
    limit: number;
    offset: number;
    count: number;
    next: string | null;
    previous: string | null;
    results: Subscriber[];
}

// 4. Creation / Input Payloads
export interface CreateSubscriberInput {
    email: string;
    first_name: string;
    last_name: string;
    groups?: number[];
    is_subscribed?: boolean;
    is_blacklisted?: boolean;
}

export interface CreateSubscriberGroupInput {
    name: string;
    description?: string;
    subscribers?: Array<{
        email: string;
        first_name?: string;
        last_name?: string;
    }>;
}
