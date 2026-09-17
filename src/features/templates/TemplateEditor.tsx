import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createTemplate,
  getTemplate,
  PREVIEW_TARGETS,
  TEMPLATE_CATEGORIES,
  updateTemplate,
  validateTemplate,
} from '../../services/templateService';
import type { TemplateCategory, TemplateDraft, TemplateValidationIssue } from '../../types';
import { Card } from '../../components/ui/Card';

const COMMON_MERGE_FIELDS = ['{{first_name}}', '{{last_name}}', '{{company_name}}', '{{licence_number}}'];

const emptyDraft: TemplateDraft = {
  name: '',
  category: 'Notices',
  subjectPreview: '',
  bodyPreview: '',
  mergeFields: [],
};

export function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [issues, setIssues] = useState<TemplateValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getTemplate(id)
      .then((t) =>
        setDraft({
          name: t.name,
          category: t.category,
          subjectPreview: t.subjectPreview,
          bodyPreview: t.bodyPreview,
          mergeFields: t.mergeFields,
        })
      )
      .catch(() => setLoadError('Could not load that template.'));
  }, [id]);

  function insertMergeField(field: string) {
    const textarea = bodyRef.current;
    const currentBody = draft.bodyPreview;
    if (!textarea) {
      setDraft((d) => ({ ...d, bodyPreview: `${d.bodyPreview}${field}` }));
      return;
    }
    const start = textarea.selectionStart ?? currentBody.length;
    const end = textarea.selectionEnd ?? currentBody.length;
    const nextBody = currentBody.slice(0, start) + field + currentBody.slice(end);
    setDraft((d) => ({
      ...d,
      bodyPreview: nextBody,
      mergeFields: d.mergeFields.includes(field) ? d.mergeFields : [...d.mergeFields, field],
    }));
  }

  function handleValidate() {
    setIssues(validateTemplate(draft));
  }

  async function handleSave() {
    const foundIssues = validateTemplate(draft);
    setIssues(foundIssues);
    if (foundIssues.length > 0) return;

    setSaving(true);
    try {
      if (isEditing && id) {
        await updateTemplate(id, draft);
      } else {
        await createTemplate(draft);
      }
      navigate('/templates');
    } catch {
      setIssues([{ field: 'name', message: 'Could not save the template. Please try again.' }]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="section-intro">
        {isEditing ? 'Edit this template.' : 'Create a new template.'} Add text, merge fields and
        conditional content, then check how it renders before saving to the library.
      </p>

      {loadError && <p className="login__error">{loadError}</p>}

      <div className="grid grid--2">
        <Card title="Template details">
          <div className="field">
            <label htmlFor="tpl-name">Name</label>
            <input
              id="tpl-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Licence Reminder"
            />
          </div>
          <div className="field">
            <label htmlFor="tpl-cat">Category</label>
            <select
              id="tpl-cat"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as TemplateCategory }))}
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tpl-subject">Subject line</label>
            <input
              id="tpl-subject"
              value={draft.subjectPreview}
              onChange={(e) => setDraft((d) => ({ ...d, subjectPreview: e.target.value }))}
              placeholder="What recipients see in their inbox"
            />
          </div>
          <div className="field">
            <label htmlFor="tpl-body">Body</label>
            <textarea
              id="tpl-body"
              ref={bodyRef}
              rows={8}
              value={draft.bodyPreview}
              onChange={(e) => setDraft((d) => ({ ...d, bodyPreview: e.target.value }))}
              placeholder="Write the message body. Use the merge field buttons to insert dynamic content."
              style={{ width: '100%', fontFamily: 'inherit', padding: 8 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {COMMON_MERGE_FIELDS.map((field) => (
              <button key={field} type="button" className="btn" onClick={() => insertMergeField(field)}>
                Insert {field}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted, #666)' }}>
            Sections, images, and conditional content blocks are configured the same way in a full
            drag-and-drop builder; this editor covers the text and merge-field workflow.
          </p>

          {issues.length > 0 && (
            <ul style={{ marginTop: 12 }}>
              {issues.map((issue, i) => (
                <li key={i} className="login__error" style={{ marginBottom: 4 }}>
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" type="button" onClick={handleValidate}>
              Validate
            </button>
            <button className="btn btn--primary" type="button" onClick={handleSave} disabled={saving}>
              Save template
            </button>
            <button className="btn" type="button" onClick={() => navigate('/templates')}>
              Cancel
            </button>
          </div>
        </Card>

        <Card title="Responsive / device & client preview">
          <p style={{ marginBottom: 4 }}>
            <strong>Subject:</strong> {draft.subjectPreview || '(no subject yet)'}
          </p>
          <p className="section-intro" style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>
            {draft.bodyPreview || '(template body will appear here)'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {PREVIEW_TARGETS.map((target) => (
              <div
                key={target.label}
                style={{
                  width: Math.min(target.widthPx, 220),
                  border: '1px solid var(--rule, #ccc)',
                  borderRadius: 4,
                  padding: 10,
                }}
              >
                <p className="card__eyebrow" style={{ marginBottom: 6 }}>
                  {target.label}
                </p>
                <p style={{ fontSize: 12, margin: 0 }}>{draft.subjectPreview || '(no subject yet)'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
