// Template Library / Template Editor (process flow §2). Wired to the real
// API's Templates endpoints (tmail-templates.postman_collection.json), same
// pattern as User Administration in adminService.ts — calls go straight
// through apiClient with no special base URL of their own.
//
// duplicateTemplate() has no matching endpoint, so it's implemented as a
// getTemplate() + createTemplate() pair instead.

import { apiClient } from './apiClient';

import type {
  EmailTemplate,
  RenderPreviewTarget,
  TemplateDraft,
  TemplateValidationIssue,
} from '../types';

/** §2 "Device / Email-client Preview" — same rendering matrix used in
 * Campaign Pre-Flight (§7/§8 of the process flow). */
export const PREVIEW_TARGETS: RenderPreviewTarget[] = [
  { label: 'Desktop — Outlook', widthPx: 680 },
  { label: 'Desktop — Gmail', widthPx: 680 },
  { label: 'Mobile — Gmail (Android)', widthPx: 360 },
  { label: 'Mobile — Mail (iOS)', widthPx: 360 },
];

// TMail's list response wraps the array in a status/message envelope.
interface TMailListResponse {
  status_code: number;
  message: string;
  data: TMailTemplateRecord[];
}

interface TMailTemplateRecord {
  id: string | number;
  name: string;
  content: string;
  attachments?: { name: string; size: number; url: string }[] | null;
  json_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

function fromTMailRecord(record: TMailTemplateRecord): EmailTemplate {
  return {
    id: String(record.id),
    name: record.name,
    updatedAt: record.updated_at ?? new Date().toISOString(),
    subjectPreview: '', // TODO: TMail has no subject field — confirm if one exists or should be derived.
    bodyPreview: record.content,
    mergeFields: [...new Set(record.content.match(/{{\s*[\w.]+\s*}}/g) ?? [])],
  };
}

// TMail's collection uses a different field name for uploads depending on
// the route: 'files' on Create, 'attachments' on Edit. `fileFieldName` lets
// createTemplate/updateTemplate each pass the right one.
function toTMailFormData(draft: TemplateDraft, fileFieldName: 'files' | 'attachments'): FormData {
  const fd = new FormData();
  fd.append('name', draft.name);
  fd.append('content', draft.bodyPreview);
  fd.append('json_data', JSON.stringify(draft.designJson ?? {}));
  for (const file of draft.files ?? []) {
    fd.append(fileFieldName, file);
  }
  return fd;
}

export async function listTemplates(): Promise<EmailTemplate[]> {
  const response = await apiClient.get<TMailListResponse>('/mail-templates/');
  return response.data.map(fromTMailRecord);
}

interface TMailSingleResponse {
  status_code: number;
  message: string;
  data: TMailTemplateRecord;
}

export async function getTemplate(id: string): Promise<EmailTemplate> {
  const response = await apiClient.get<TMailSingleResponse>(`/mail-templates/${id}`);
  return fromTMailRecord(response.data);
}

export async function createTemplate(draft: TemplateDraft): Promise<EmailTemplate> {
  const response = await apiClient.post<TMailSingleResponse>('/mail-templates/', toTMailFormData(draft, 'files'));
  return fromTMailRecord(response.data);
}

export async function updateTemplate(id: string, draft: TemplateDraft): Promise<EmailTemplate> {
  const response = await apiClient.patch<TMailSingleResponse>(
    `/mail-templates/${id}/`,
    toTMailFormData(draft, 'attachments')
  );
  return fromTMailRecord(response.data);
}

export async function duplicateTemplate(id: string): Promise<EmailTemplate> {
  // No dedicated TMail endpoint for this — fetch the existing template and
  // recreate it under a tweaked name instead.
  const existing = await getTemplate(id);
  return createTemplate({
    name: `${existing.name} (copy)`,
    subjectPreview: existing.subjectPreview,
    bodyPreview: existing.bodyPreview,
    mergeFields: existing.mergeFields,
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  return apiClient.delete<void>(`/mail-templates/${id}/`);
}

/** §2 "Validate" — lightweight client-side checks; a real integration would
 * likely also validate server-side (e.g. brand-guideline / merge-field
 * existence checks owned by the design/approval team per the RACI). */
export function validateTemplate(draft: TemplateDraft): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];
  if (!draft.name.trim()) issues.push({ field: 'name', message: 'Give the template a name.' });
  if (!draft.subjectPreview.trim()) issues.push({ field: 'subjectPreview', message: 'Add a subject line.' });
  if (!draft.bodyPreview.trim()) issues.push({ field: 'bodyPreview', message: 'The template body is empty.' });

  const openBraces = (draft.bodyPreview.match(/{{/g) ?? []).length;
  const closeBraces = (draft.bodyPreview.match(/}}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    issues.push({ field: 'mergeFields', message: 'A merge field looks unbalanced — check for a missing {{ or }}.' });
  }
  return issues;
}