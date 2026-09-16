// Template Library, Template Editor, and the device/email-client preview
// matrix (process flow §2). Wired to the real Tmail /mail-templates/
// endpoints — see services/templateService.ts.

export type TemplateCategory = 'Notices' | 'Newsletters' | 'Reminders' | 'Campaigns';

export interface EmailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  updatedAt: string;
  subjectPreview: string;
  bodyPreview: string;
  /** Merge fields present in the body, e.g. '{{first_name}}'. */
  mergeFields: string[];
}

export interface TemplateDraft {
  name: string;
  category: TemplateCategory;
  subjectPreview: string;
  bodyPreview: string;
  mergeFields: string[];
  /** Files to upload alongside the template ('files' field on Create, 'attachments' on Edit). */
  files?: File[];
  /** Arbitrary extra data persisted in the API's json_data column (also used
   * to round-trip category/subject, which the TMail schema has no native
   * columns for). */
  designJson?: Record<string, unknown>;
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
