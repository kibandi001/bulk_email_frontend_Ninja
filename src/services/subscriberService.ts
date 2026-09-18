import { apiClient } from './apiClient';
import type {
    Subscriber,
    SubscriberGroup,
    PaginatedSubscribersResponse,
    CreateSubscriberInput,
    CreateSubscriberGroupInput,
} from '../types/subscriber';

// Standard API response envelope from Tmail
interface ApiResponse<T> {
    status_code: number;
    message: string;
    data: T;
}

export interface SubscriberFilterParams {
    email?: string;
    is_subscribed?: boolean;
    is_blacklisted?: boolean;
    group_id?: number | string;
    group_name?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
}

// ----------------------------------------------------
// SUBSCRIBER GROUPS
// ----------------------------------------------------

/** List all subscriber groups */
export async function listSubscriberGroups(): Promise<SubscriberGroup[]> {
    const res = await apiClient.get<ApiResponse<SubscriberGroup[]>>('/subscriber-groups/');
    return res.data;
}

/** Get a single subscriber group */
export async function getSubscriberGroup(id: number): Promise<SubscriberGroup> {
    const res = await apiClient.get<ApiResponse<SubscriberGroup>>(`/subscriber-groups/${id}/`);
    return res.data;
}

/** Create a new subscriber group */
export async function createSubscriberGroup(input: CreateSubscriberGroupInput): Promise<SubscriberGroup> {
    const res = await apiClient.post<ApiResponse<SubscriberGroup>>('/subscriber-groups/', {
        name: input.name,
        description: input.description ?? '',
        subscribers: input.subscribers ?? [],
    });
    return res.data;
}
// update an existing subscriber group

export async function updateSubscriberGroup(
    id: number,
    patch: Partial<CreateSubscriberGroupInput>
): Promise<SubscriberGroup> {
    const res = await apiClient.patch<ApiResponse<SubscriberGroup>>(`/subscriber-groups/${id}/`, patch);
    return res.data;
}

/** Delete a subscriber group */
export async function deleteSubscriberGroup(id: number): Promise<void> {
    await apiClient.delete(`/subscriber-groups/${id}/`);
}

// ----------------------------------------------------
// SUBSCRIBERS
// ----------------------------------------------------

/** Fetch paginated list of subscribers */
export async function listPaginatedSubscribers(
    params: SubscriberFilterParams = {}
): Promise<PaginatedSubscribersResponse> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.email) query.set('email', params.email);
    if (params.is_subscribed !== undefined) query.set('is_subscribed', String(params.is_subscribed));
    if (params.is_blacklisted !== undefined) query.set('is_blacklisted', String(params.is_blacklisted));
    if (params.group_id) query.set('group_id', String(params.group_id));
    if (params.group_name) query.set('group_name', params.group_name);
    if (params.sort_by) query.set('sort_by', params.sort_by);

    const qs = query.toString();
    return apiClient.get<PaginatedSubscribersResponse>(`/subscribers/paginated/${qs ? `?${qs}` : ''}`);
}

/** Get single subscriber by ID */
export async function getSubscriber(id: number): Promise<Subscriber> {
    const res = await apiClient.get<ApiResponse<Subscriber>>(`/subscribers/${id}/`);
    return res.data;
}

/** Create a subscriber (returns created email or newly created subscriber) */
export async function createSubscriber(input: CreateSubscriberInput): Promise<string> {
    const res = await apiClient.post<ApiResponse<string>>('/subscribers/', {
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        groups: input.groups ?? [],
        is_subscribed: input.is_subscribed ?? true,
        is_blacklisted: input.is_blacklisted ?? false,
    });
    return res.data;
}

/** Partial update (PATCH) subscriber (e.g. update status or groups) */
export async function updateSubscriber(
    id: number,
    patch: Partial<CreateSubscriberInput>
): Promise<Subscriber> {
    const res = await apiClient.patch<ApiResponse<Subscriber>>(`/subscribers/${id}/`, patch);
    return res.data;
}

/** Delete a subscriber */
export async function deleteSubscriber(id: number): Promise<void> {
    await apiClient.delete(`/subscribers/${id}/`);
}

/** Bulk delete subscribers by IDs */
export async function bulkDeleteSubscribers(ids: number[]): Promise<void> {
    await apiClient.post('/subscribers/bulk-delete/', { ids });
}

/** Upload CSV of subscribers to a group */
export async function uploadSubscriberCsv(file: File, groupId: number): Promise<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', String(groupId));

    return apiClient.post('/subscribers/upload-csv/', formData);
}
