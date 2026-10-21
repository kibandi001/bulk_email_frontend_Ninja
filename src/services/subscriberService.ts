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

/** Unsubscribe a single subscriber (does not blacklist them) */
export async function unsubscribeSubscriber(id: number): Promise<Subscriber> {
    return updateSubscriber(id, { is_subscribed: false });
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

// ----------------------------------------------------
// CSV EXPORT
// ----------------------------------------------------
// There is no export endpoint in the Subscribers API collection, so this
// builds the CSV client-side from whatever subscriber list is passed in
// (same pattern as auditService.downloadAuditLog).

/** Trigger a browser download of the given subscribers as a CSV file. */
export function downloadSubscribersCsv(subscribers: Subscriber[]): void {
    const header = ['Email', 'First Name', 'Last Name', 'Group', 'Subscribed', 'Blacklisted', 'Created At'];
    const csv = [
        header,
        ...subscribers.map((s) => [
            s.email,
            s.first_name === 'nan' ? '' : s.first_name,
            s.last_name === 'nan' ? '' : s.last_name,
            s.group_name ?? '',
            s.is_subscribed ? 'Yes' : 'No',
            s.is_blacklisted ? 'Yes' : 'No',
            s.created_at ?? '',
        ]),
    ]
        .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/** Fetch every subscriber matching the given filters (pages through, ignoring limit/offset). */
export async function listAllSubscribers(
    params: Omit<SubscriberFilterParams, 'limit' | 'offset'> = {}
): Promise<Subscriber[]> {
    const PAGE = 200;
    let offset = 0;
    const all: Subscriber[] = [];

    while (true) {
        const res = await listPaginatedSubscribers({ ...params, limit: PAGE, offset });
        const items = Array.isArray(res) ? res : (res as any)?.results ?? (res as any)?.data ?? [];
        all.push(...items);
        const count = (res as any)?.count ?? all.length;
        offset += PAGE;
        if (items.length < PAGE || all.length >= count) break;
    }

    return all;
}