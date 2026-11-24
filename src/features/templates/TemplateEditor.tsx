import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import type { EditorRef, EmailEditorProps } from 'react-email-editor';
import {
  createTemplate,
  getTemplate,
  updateTemplate,
  validateTemplate,
} from '../../services/templateService';
import type { TemplateDraft, TemplateValidationIssue } from '../../types';
import { Card } from '../../components/ui/Card';

const COMMON_MERGE_FIELDS = ['{{first_name}}', '{{last_name}}', '{{email}}'];

const UNLAYER_MERGE_TAGS = {
  first_name: { name: 'First Name', value: '{{first_name}}' },
  last_name: { name: 'Last Name', value: '{{last_name}}' },
  email: { name: 'Email Address', value: '{{email}}' },
  name: { name: 'Full Name', value: '{{name}}' },
};

const UNLAYER_OPTIONS = {
  mergeTags: UNLAYER_MERGE_TAGS,
  displayMode: 'email' as const,
  appearance: {
    theme: 'modern_light' as const,
    panels: {
      tools: {
        dock: 'right' as const,
      },
    },
  },
  features: {
    textEditor: {
      spellChecker: true,
    },
  },
  tools: {
    button: { enabled: true },
    divider: { enabled: true },
    heading: { enabled: true },
    html: { enabled: true },
    image: { enabled: true },
    menu: { enabled: true },
    social: { enabled: true },
    text: { enabled: true },
    timer: { enabled: true },
    video: { enabled: true },
  },
};

type EditorMode = 'simple' | 'builder';
type PreviewDevice = 'desktop' | 'mobile';
type PreviewView = 'visual' | 'code';

const emptyDraft: TemplateDraft = {
  name: '',
  subjectPreview: '',
  bodyPreview: '',
  mergeFields: [],
};

const EMAIL_EDITOR_FILL_CSS = `
  .email-editor-fill,
  .email-editor-fill > div,
  .email-editor-fill iframe {
    height: 100% !important;
    min-height: 100% !important;
    width: 100% !important;
  }
`;

function toPreviewDocument(body: string): string {
  if (/<html[\s>]/i.test(body)) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;padding:20px;margin:0;background:#ffffff;}</style></head><body>${body || '<p style="color:#888;">(No content yet)</p>'}</body></html>`;
}

function fillMergeFields(text: string): string {
  const sampleData: Record<string, string> = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@nca.go.ke',
    name: 'John Doe',
  };

  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    const k = key.toLowerCase();
    return sampleData[k] !== undefined ? sampleData[k] : match;
  });
}

export function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const emailEditorRef = useRef<EditorRef>(null);
  const unlayerInstanceRef = useRef<any>(null);
  const unlayerReadyRef = useRef(false);

  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [editorMode, setEditorMode] = useState<EditorMode>('simple');
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [issues, setIssues] = useState<TemplateValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Preview Controls
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [previewView, setPreviewView] = useState<PreviewView>('visual');
  const [fillSample, setFillSample] = useState(true);

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

        const isVisual = Boolean(t.designJson || (t.bodyPreview && t.bodyPreview.includes('<')));
        setEditorMode(isVisual ? 'builder' : 'simple');

        // If Unlayer editor was already initialized before API returned, load the design now
        if (t.designJson && unlayerReadyRef.current && unlayerInstanceRef.current) {
          try {
            unlayerInstanceRef.current.loadDesign(t.designJson);
          } catch (err) {
            console.error('Failed to load design into Unlayer:', err);
          }
        }
      })
      .catch(() => setLoadError('Could not load that template.'));
  }, [id]);

  // Close builder modal on Escape
  useEffect(() => {
    if (!builderModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setBuilderModalOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [builderModalOpen]);

  // Inject Unlayer sizing CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-email-editor-fill', 'true');
    style.textContent = EMAIL_EDITOR_FILL_CSS;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  // When Unlayer is ready, save reference and load draft design
  const onEmailEditorReady: EmailEditorProps['onReady'] = (editor) => {
    unlayerInstanceRef.current = editor;
    unlayerReadyRef.current = true;

    if (draft.designJson && typeof draft.designJson === 'object') {
      try {
        editor.loadDesign(draft.designJson as any);
      } catch (err) {
        console.error('Failed to load design into Unlayer:', err);
      }
    }
  };

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

  // Pull design out of Unlayer and commit to draft
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

  // Calculate live preview content
  const previewSubjectText = useMemo(() => {
    const raw = draft.subjectPreview || '(no subject yet)';
    return fillSample ? fillMergeFields(raw) : raw;
  }, [draft.subjectPreview, fillSample]);

  const previewBodyContent = useMemo(() => {
    const raw = draft.bodyPreview || '';
    return fillSample ? fillMergeFields(raw) : raw;
  }, [draft.bodyPreview, fillSample]);

  return (
    <div>
      <p className="section-intro">
        {isEditing ? 'Edit this template.' : 'Create a new template.'} Add text, merge fields, or design with the drag-and-drop builder, and check live preview before saving.
      </p>

      {loadError && <p className="login__error">{loadError}</p>}

      <div className="grid grid--2">
        {/* Left Side: Editor Form */}
        <Card title="Template details">
          <div className="field">
            <label htmlFor="tpl-name">Template Name</label>
            <input
              id="tpl-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Licence Renewal Notice"
            />
          </div>

          <div className="field">
            <label htmlFor="tpl-subject">Subject Line</label>
            <input
              id="tpl-subject"
              value={draft.subjectPreview}
              onChange={(e) => setDraft((d) => ({ ...d, subjectPreview: e.target.value }))}
              placeholder="e.g. Action Required: Renewal of {{first_name}}'s NCA Licence"
            />
          </div>

          {/* Mode Switcher */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Editor Type
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={editorMode === 'simple' ? 'btn btn--primary' : 'btn'}
                onClick={() => setEditorMode('simple')}
              >
                Simple Text Editor
              </button>
              <button
                type="button"
                className={editorMode === 'builder' ? 'btn btn--primary' : 'btn'}
                onClick={() => {
                  setEditorMode('builder');
                  setBuilderModalOpen(true);
                }}
              >
                {editorMode === 'builder' ? 'Open Drag-and-Drop Builder' : 'Switch to Visual Builder'}
              </button>
            </div>
          </div>

          {editorMode === 'simple' && (
            <>
              {draft.bodyPreview.includes('<') && (
                <div style={{ padding: 10, background: 'var(--amber-dim, #fff3cd)', color: 'var(--ink)', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
                  <strong>Notice:</strong> This template contains visual HTML layout. You can edit the text directly below, or switch back to the Visual Builder.
                </div>
              )}
              <div className="field">
                <label htmlFor="tpl-body">Email Body</label>
                <textarea
                  id="tpl-body"
                  ref={bodyRef}
                  rows={9}
                  value={draft.bodyPreview}
                  onChange={(e) => setDraft((d) => ({ ...d, bodyPreview: e.target.value }))}
                  placeholder="Write the message body here. Click the merge field buttons below to insert dynamic recipient variables."
                  style={{ width: '100%', fontFamily: 'inherit', padding: 10, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {COMMON_MERGE_FIELDS.map((field) => (
                  <button key={field} type="button" className="btn" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => insertMergeField(field)}>
                    + {field}
                  </button>
                ))}
              </div>
            </>
          )}

          {editorMode === 'builder' && (
            <p style={{ fontSize: 13, color: 'var(--muted, #666)', marginBottom: 12 }}>
              This template was built with the drag-and-drop builder. Use the button above to reopen
              and keep editing it, or switch to Simple editor to write plain text instead.
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

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn btn--primary" type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
            <button className="btn" type="button" onClick={() => navigate('/templates')}>
              Cancel
            </button>
          </div>
        </Card>

        {/* Right Side: Live Responsive Preview Card */}
        <Card title="Live Preview">
          {/* Preview Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className={`btn ${previewView === 'visual' ? 'btn--primary' : ''}`}
                style={{ fontSize: 12, padding: '4px 8px' }}
                onClick={() => setPreviewView('visual')}
              >
                Visual Preview
              </button>
              <button
                type="button"
                className={`btn ${previewView === 'code' ? 'btn--primary' : ''}`}
                style={{ fontSize: 12, padding: '4px 8px' }}
                onClick={() => setPreviewView('code')}
              >
                HTML / Source
              </button>
            </div>

            {/* Device Toggle */}
            {previewView === 'visual' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className={`btn ${previewDevice === 'desktop' ? 'btn--primary' : ''}`}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={`btn ${previewDevice === 'mobile' ? 'btn--primary' : ''}`}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  Mobile (375px)
                </button>
              </div>
            )}

            {/* Sample Variables Toggle */}
            <label style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fillSample}
                onChange={(e) => setFillSample(e.target.checked)}
              />
              Fill sample merge data
            </label>
          </div>

          {/* Subject Preview Banner */}
          <div style={{ padding: '8px 12px', background: '#faf9f6', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
            <strong>Subject: </strong>
            <span>{previewSubjectText}</span>
          </div>

          {/* Preview Frame Container */}
          {previewView === 'visual' ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#f2f1ed',
                padding: previewDevice === 'mobile' ? '16px 10px' : '8px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                minHeight: 520,
              }}
            >
              <iframe
                title="Template Live Preview"
                srcDoc={toPreviewDocument(previewBodyContent)}
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '100%',
                  height: '560px',
                  border: '1px solid var(--line)',
                  borderRadius: previewDevice === 'mobile' ? '12px' : '4px',
                  backgroundColor: '#ffffff',
                  boxShadow: previewDevice === 'mobile' ? '0 4px 16px rgba(0,0,0,0.15)' : 'none',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          ) : (
            <pre
              style={{
                background: '#1a1f2c',
                color: '#e2e8f0',
                padding: 16,
                borderRadius: 6,
                fontSize: 12,
                maxHeight: 560,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {draft.bodyPreview || '(Empty content)'}
            </pre>
          )}
        </Card>
      </div>

      {/* Unlayer Drag-and-Drop Modal */}
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
              backgroundColor: '#ffffff',
              borderRadius: 8,
              width: '95vw',
              height: '90vh',
              maxWidth: 1400,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderBottom: '1px solid var(--line, #ccc)',
                flexShrink: 0,
                backgroundColor: '#faf9f6',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Drag-and-drop builder</h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Design your layout with images, buttons, and text blocks. Click Done when finished.
                </span>
              </div>
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
                onReady={onEmailEditorReady}
                options={UNLAYER_OPTIONS}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
