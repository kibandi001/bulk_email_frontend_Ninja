import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import type { EditorRef, EmailEditorProps } from 'react-email-editor';
import { z } from 'zod';
import {
  createTemplate,
  getTemplate,
  updateTemplate,
  validateTemplate,
} from '../../services/templateService';
import type { TemplateDraft, TemplateValidationIssue } from '../../types';
import { Card } from '../../components/ui/Card';

// Rough shape check for Unlayer's design JSON before handing it back to
// loadDesign() — designJson is persisted/round-tripped data, so this guards
// against a stale or corrupted record crashing the editor at load time.
const JSONTemplateEmailSchema = z.object({
  counters: z.record(z.string(), z.number()),
  body: z.record(z.string(), z.any()),
});

const COMMON_MERGE_FIELDS = ['{{first_name}}', '{{last_name}}'];

const UNLAYER_MERGE_TAGS = {
  first_name: { name: 'First Name', value: '{{first_name}}' },
  last_name: { name: 'Last Name', value: '{{last_name}}' },
};

type EditorMode = 'simple' | 'builder';

const emptyDraft: TemplateDraft = {
  name: '',
  subjectPreview: '',
  bodyPreview: '',
  mergeFields: [],
};

// react-email-editor renders an inner <div> with a fixed pixel height
// wrapped around the Unlayer iframe. Without this, setting height:100% on
// the component's outer wrapper leaves the actual canvas stuck at its
// default height and produces the "empty space" at the bottom of the modal.
const EMAIL_EDITOR_FILL_CSS = `
  .email-editor-fill,
  .email-editor-fill > div,
  .email-editor-fill iframe {
    height: 100% !important;
    min-height: 100% !important;
    width: 100% !important;
  }
`;

export function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const emailEditorRef = useRef<EditorRef>(null);

  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [editorMode, setEditorMode] = useState<EditorMode>('simple');
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [issues, setIssues] = useState<TemplateValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getTemplate(id)
      .then((t) => {
        setDraft({
          name: t.name,
          subjectPreview: t.subjectPreview,
          bodyPreview: t.bodyPreview,
          mergeFields: t.mergeFields,
          designJson: t.designJson,
        });
        
        // If the loaded template has a design JSON or HTML (from the builder), 
        // switch the mode to 'builder' AND open the modal immediately.
        if (t.designJson || (t.bodyPreview && t.bodyPreview.includes('<'))) {
          setEditorMode('builder');
          setBuilderModalOpen(true);
        } else {
          setEditorMode('simple');
        }
      })
      .catch(() => setLoadError('Could not load that template.'));
  }, [id]);

  // Close the builder modal on Escape (without saving its contents — same
  // as clicking the overlay). Use "Done" inside the modal to keep changes.
  useEffect(() => {
    if (!builderModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setBuilderModalOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [builderModalOpen]);

  // Inject the CSS that makes the Unlayer iframe fill its container.
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-email-editor-fill', 'true');
    style.textContent = EMAIL_EDITOR_FILL_CSS;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

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

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    setPendingFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function previewFile(file: File) {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleBuilderDone() {
    emailEditorRef.current?.editor?.exportHtml((data) => {
      const { design, html } = data;
      setDraft((d) => ({ ...d, bodyPreview: html, designJson: design }));
      setEditorMode('builder');
      setBuilderModalOpen(false);
    });
  }

  async function persistDraft(finalDraft: TemplateDraft) {
    const foundIssues = validateTemplate(finalDraft);
    setIssues(foundIssues);
    if (foundIssues.length > 0) return;

    setSaving(true);
    try {
      if (isEditing && id) {
        await updateTemplate(id, finalDraft);
      } else {
        await createTemplate(finalDraft);
      }
      navigate('/templates');
    } catch {
      setIssues([{ field: 'name', message: 'Could not save the template. Please try again.' }]);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persistDraft({ ...draft, files: pendingFiles });
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
            <label htmlFor="tpl-subject">Subject line</label>
            <input
              id="tpl-subject"
              value={draft.subjectPreview}
              onChange={(e) => setDraft((d) => ({ ...d, subjectPreview: e.target.value }))}
              placeholder="What recipients see in their inbox"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className={editorMode === 'simple' ? 'btn btn--primary' : 'btn'}
              onClick={() => setEditorMode('simple')}
            >
              Simple editor
            </button>
            <button 
              type="button" 
              className={editorMode === 'builder' ? 'btn btn--primary' : 'btn'} 
              onClick={() => setBuilderModalOpen(true)}
            >
              {editorMode === 'builder' ? 'Edit in drag-and-drop builder' : 'Open drag-and-drop builder'}
            </button>
          </div>

          {editorMode === 'simple' && (
            <>
              {draft.bodyPreview.includes('<') && (
                <p className="login__error" style={{ marginBottom: 12 }}>
                  <strong>Warning:</strong> You are editing HTML from the drag-and-drop builder as plain text.
                  Saving changes here will overwrite the visual layout.
                </p>
              )}
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
                Sections, images, and conditional content blocks are available in the drag-and-drop
                builder; this editor covers the plain text and merge-field workflow.
              </p>
            </>
          )}

          {editorMode === 'builder' && (
            <p style={{ fontSize: 13, color: 'var(--muted, #666)', marginBottom: 12 }}>
              This template was built with the drag-and-drop builder. Use the button above to reopen
              and keep editing it, or switch to Simple editor to write plain text instead (this
              replaces the builder layout when saved).
            </p>
          )}

          <div className="field">
            <label htmlFor="tpl-files">Attachments</label>
            <input
              id="tpl-files"
              type="file"
              multiple
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = ''; 
              }}
            />
            {pendingFiles.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {pendingFiles.map((file, i) => (
                  <li key={`${file.name}-${i}`} style={{ fontSize: 13, marginBottom: 4 }}>
                    {file.name}{' '}
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '0 6px', fontSize: 12, marginLeft: 6 }}
                      onClick={() => previewFile(file)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '0 6px', fontSize: 12, marginLeft: 4 }}
                      onClick={() => removePendingFile(i)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
            <button className="btn btn--primary" type="button" onClick={handleSave} disabled={saving}>
              Save template
            </button>
            <button className="btn" type="button" onClick={() => navigate('/templates')}>
              Cancel
            </button>
          </div>
        </Card>

        <Card title="Preview">
          <p style={{ marginBottom: 4 }}>
            <strong>Subject:</strong> {draft.subjectPreview || '(no subject yet)'}
          </p>

          {editorMode === 'builder' ? (
            <div
              style={{ marginTop: 12, border: '1px solid var(--rule, #eee)', padding: 16, borderRadius: 4 }}
              dangerouslySetInnerHTML={{ __html: draft.bodyPreview }}
            />
          ) : (
            <p className="section-intro" style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>
              {draft.bodyPreview}
            </p>
          )}
        </Card>
      </div>

      {builderModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Drag-and-drop builder"
          onClick={() => setBuilderModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface, #fff)',
              borderRadius: 8,
              width: '95vw',
              height: '90vh',
              maxWidth: 1400,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid var(--rule, #ccc)',
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: 0 }}>Drag-and-drop builder</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="button" onClick={() => setBuilderModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn--primary" type="button" onClick={handleBuilderDone}>
                  Done
                </button>
              </div>
            </div>

            <div
              className="email-editor-fill"
              style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }}
            >
              <EmailEditor
                ref={emailEditorRef}
                style={{ width: '100%', height: '100%', flex: 1, minHeight: 0 }}
                minHeight={600}
                options={{ 
                  mergeTags: UNLAYER_MERGE_TAGS, 
                  displayMode: 'email',
                  // This is the magic fix: we tell Unlayer to run this callback
                  // exactly when it has finished booting up.
                  onLoad: () => {
                    if (draft.designJson) {
                      const parsed = JSONTemplateEmailSchema.safeParse(draft.designJson);
                      if (parsed.success) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        emailEditorRef.current?.editor?.loadDesign(parsed.data as any);
                      } else {
                        console.error('Design JSON validation failed', parsed.error);
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}