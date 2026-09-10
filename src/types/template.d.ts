// Template Library, Template Editor, and the device/email-client preview
// matrix (process flow §2). No endpoint for this exists in the Tmail API
// Postman collection, so this feature stays on mock data — same pattern as
// Quota, Roles & Permissions, and System Status in adminService.ts.

import { API_BASE_URL, MOCK_LATENCY_MS } from '../config/constants';

export interface EmailTemplate {
  id: string;
  name: string;
  updatedAt: string;
  subjectPreview: string;
  bodyPreview: string;
  /** Merge fields present in the body, e.g. '{{first_name}}'. */
  mergeFields: string[];
}

export interface TemplateDraft {
  name: string;
  subjectPreview: string;
  bodyPreview: string;
  mergeFields: string[];
  designJson?: Record<string, unknown>;
  /** Files picked via the upload button, sent as TMail's `files` (create) /
   * `attachments` (edit) form field. Not persisted in EmailTemplate — once
   * uploaded, TMail owns the stored copies. */
  files?: File[];
}

export interface TemplateValidationIssue {
  field: 'name' | 'subjectPreview' | 'bodyPreview' | 'mergeFields';
  message: string;
}

/** One row of the device/email-client rendering matrix (§2, §7). */
export interface RenderPreviewTarget {
  label: string;
  widthPx: number;
}