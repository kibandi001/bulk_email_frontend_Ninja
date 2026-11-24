import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
} from '../../services/templateService';
import { LOCALE } from '../../config/constants';
import type { EmailTemplate } from '../../types';
import './TemplateLibrary.css';

type SortKey = 'name' | 'updatedAt';
type ViewMode = 'grid' | 'table';

function toPreviewDocument(body: string): string {
  if (/<html[\s>]/i.test(body)) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;padding:18px;margin:0;background:#ffffff;}</style></head><body>${body || '<p style="color:#888;">(Empty template)</p>'}</body></html>`;
}

function fillMergeFields(body: string): string {
  const sampleData: Record<string, string> = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@nca.go.ke',
    name: 'Jane Doe',
  };

  return body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    const k = key.toLowerCase();
    return sampleData[k] !== undefined ? sampleData[k] : match;
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export function TemplateLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listTemplates()
      .then(setTemplates)
      .catch(() => setError('Could not load templates.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Close preview on Escape
  useEffect(() => {
    if (!previewId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewId]);

  const visible = useMemo(() => {
    const filtered = templates.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      (t.subjectPreview && t.subjectPreview.toLowerCase().includes(query.toLowerCase()))
    );
    return [...filtered].sort((a, b) =>
      sortKey === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [templates, query, sortKey]);

  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) : undefined;

  async function handleDuplicate(id: string) {
    setError(null);
    try {
      await duplicateTemplate(id);
      load();
    } catch {
      setError('Could not duplicate that template.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    setError(null);
    try {
      await deleteTemplate(id);
      if (previewId === id) setPreviewId(null);
      load();
    } catch {
      setError('Could not delete that template.');
    }
  }

  return (
    <div className="template-library">
      {/* Header */}
      <div className="template-library__header">
        <div className="template-library__title-group">
          <h1>Template Library</h1>
          <p>Approved NCA email templates. Create, customize, and use in campaigns.</p>
        </div>

        <button
          className="btn btn--primary"
          onClick={() => navigate('/templates/new')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Template
        </button>
      </div>

      {error && <div className="login__error" style={{ margin: 0 }}>{error}</div>}

      {/* Compact Toolbar */}
      <div className="template-library__toolbar">
        <div className="template-library__toolbar-left">
          <div className="template-library__search-box">
            <svg
              className="template-library__search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="template-library__search-input"
              placeholder="Search templates by name or subject…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
            {visible.length} of {templates.length} templates
          </span>
        </div>

        <div className="template-library__toolbar-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="tpl-sort" style={{ fontSize: 12, color: 'var(--muted)' }}>Sort:</label>
            <select
              id="tpl-sort"
              className="template-library__sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="updatedAt">Last updated</option>
              <option value="name">Template name</option>
            </select>
          </div>

          {/* Grid vs Table View Switcher */}
          <div className="template-library__view-toggle">
            <button
              type="button"
              className={`template-library__view-btn ${viewMode === 'grid' ? 'template-library__view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid Cards view"
              aria-label="Grid Cards view"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              className={`template-library__view-btn ${viewMode === 'table' ? 'template-library__view-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Compact Table view"
              aria-label="Compact Table view"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--muted)' }}>
          Loading templates…
        </div>
      ) : visible.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', border: '1px dashed var(--line)', borderRadius: 6 }}>
          <p style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
            {query ? `No templates found matching "${query}"` : 'No templates created yet'}
          </p>
          <button className="btn btn--primary" onClick={() => navigate('/templates/new')}>
            Create Your First Template
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Cards Grid View */
        <div className="template-library__grid">
          {visible.map((t) => {
            const hasHtml = Boolean(t.designJson || (t.bodyPreview && t.bodyPreview.includes('<')));
            const snippet = stripHtml(t.bodyPreview || '');

            return (
              <div key={t.id} className="template-card">
                {/* Visual Thumbnail */}
                <div
                  className="template-card__preview-thumb"
                  onClick={() => setPreviewId(t.id)}
                  title="Click to preview template"
                >
                  <div className="template-card__badge-row">
                    <span className="template-card__type-badge">
                      {hasHtml ? 'Visual Builder' : 'Simple Text'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--blueprint)', fontWeight: 600 }}>
                      Preview ↗
                    </span>
                  </div>

                  <div className="template-card__thumb-body">
                    {snippet ? snippet.slice(0, 110) + (snippet.length > 110 ? '…' : '') : '(No content)'}
                  </div>
                </div>

                {/* Card Content */}
                <div className="template-card__content">
                  <h3 className="template-card__name" title={t.name}>
                    {t.name}
                  </h3>
                  <p className="template-card__subject" title={t.subjectPreview || 'No subject'}>
                    {t.subjectPreview ? `Subject: ${t.subjectPreview}` : 'No subject specified'}
                  </p>

                  {/* Merge Tags */}
                  {t.mergeFields && t.mergeFields.length > 0 && (
                    <div className="template-card__tags">
                      {t.mergeFields.slice(0, 3).map((f) => (
                        <span key={f} className="template-card__tag">
                          {f}
                        </span>
                      ))}
                      {t.mergeFields.length > 3 && (
                        <span className="template-card__tag">+{t.mergeFields.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="template-card__footer">
                  <span className="template-card__date">
                    {new Date(t.updatedAt).toLocaleDateString(LOCALE)}
                  </span>

                  <div className="template-card__actions">
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: '3px 8px' }}
                      onClick={() => navigate(`/templates/${t.id}/edit`)}
                      title="Edit template"
                    >
                      Edit
                    </button>
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: '3px 8px' }}
                      onClick={() => handleDuplicate(t.id)}
                      title="Duplicate"
                    >
                      Copy
                    </button>
                    <button
                      className="btn btn--primary"
                      style={{ fontSize: 12, padding: '3px 8px' }}
                      onClick={() => navigate(`/campaigns?templateId=${t.id}`)}
                      title="Use in campaign"
                    >
                      Use
                    </button>
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: '3px 6px', color: 'var(--alert)' }}
                      onClick={() => handleDelete(t.id)}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="template-library__table-wrap">
          <table className="template-library__table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Template Name & Subject</th>
                <th style={{ width: '15%' }}>Type</th>
                <th style={{ width: '22%' }}>Merge Variables</th>
                <th style={{ width: '13%' }}>Updated</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const hasHtml = Boolean(t.designJson || (t.bodyPreview && t.bodyPreview.includes('<')));
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {t.subjectPreview || 'No subject'}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 3,
                          background: hasHtml ? 'var(--blueprint-dim)' : 'var(--paper)',
                          color: hasHtml ? 'var(--blueprint)' : 'var(--muted)',
                          fontWeight: 500,
                        }}
                      >
                        {hasHtml ? 'Visual Builder' : 'Simple Text'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {t.mergeFields && t.mergeFields.length > 0 ? (
                          t.mergeFields.map((f) => (
                            <span
                              key={f}
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                background: '#f5f4ef',
                                border: '1px solid var(--line)',
                                padding: '1px 5px',
                                borderRadius: 3,
                              }}
                            >
                              {f}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {new Date(t.updatedAt).toLocaleDateString(LOCALE)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => setPreviewId(t.id)}
                        >
                          Preview
                        </button>
                        <button
                          className="btn"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => navigate(`/templates/${t.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn--primary"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => navigate(`/campaigns?templateId=${t.id}`)}
                        >
                          Use
                        </button>
                        <button
                          className="btn"
                          style={{ fontSize: 12, padding: '4px 6px', color: 'var(--alert)' }}
                          onClick={() => handleDelete(t.id)}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${previewTemplate.name}`}
          onClick={() => setPreviewId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              width: 'min(940px, 100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 20,
              position: 'relative',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{previewTemplate.name}</h2>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {previewTemplate.subjectPreview ? `Subject: ${previewTemplate.subjectPreview}` : 'No subject'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Device preview buttons */}
                <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                  <button
                    type="button"
                    className={`btn ${previewDevice === 'desktop' ? 'btn--primary' : ''}`}
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={`btn ${previewDevice === 'mobile' ? 'btn--primary' : ''}`}
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    Mobile (375px)
                  </button>
                </div>

                <button
                  className="btn"
                  onClick={() => setPreviewId(null)}
                  aria-label="Close preview"
                  style={{ fontSize: 16, lineHeight: 1, padding: '6px 10px' }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Rendered Preview Frame */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#f2f1ed',
                padding: previewDevice === 'mobile' ? '16px 10px' : '10px',
                borderRadius: 6,
                border: '1px solid var(--line)',
              }}
            >
              <iframe
                title={`Rendered preview of ${previewTemplate.name}`}
                srcDoc={toPreviewDocument(fillMergeFields(previewTemplate.bodyPreview || ''))}
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '100%',
                  height: '60vh',
                  border: '1px solid var(--line)',
                  borderRadius: previewDevice === 'mobile' ? '12px' : '4px',
                  backgroundColor: '#ffffff',
                  boxShadow: previewDevice === 'mobile' ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <div>
                {previewTemplate.mergeFields && previewTemplate.mergeFields.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Variables: <strong>{previewTemplate.mergeFields.join(', ')}</strong>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    navigate(`/templates/${previewTemplate.id}/edit`);
                  }}
                >
                  Edit Template
                </button>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    navigate(`/campaigns?templateId=${previewTemplate.id}`);
                  }}
                >
                  Use in Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
