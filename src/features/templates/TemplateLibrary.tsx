import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
  PREVIEW_TARGETS,
} from '../../services/templateService';
import { LOCALE } from '../../config/constants';
import type { EmailTemplate } from '../../types';
import { Card } from '../../components/ui/Card';

type SortKey = 'name' | 'updatedAt';

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function TemplateLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load templates.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // Support direct preview link via ?preview=id from Campaign Studio
  useEffect(() => {
    const previewParam = searchParams.get('preview');
    if (previewParam) {
      setPreviewId(previewParam);
    }
  }, [searchParams]);

  // Close the preview modal on Escape, same as clicking the overlay/X.
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
      (t.name || '').toLowerCase().includes(query.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortKey === 'name'
        ? (a.name || '').localeCompare(b.name || '')
        : (b.updatedAt || '').localeCompare(a.updatedAt || '')
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

  async function handleDelete(t: EmailTemplate) {
    if (!window.confirm(`Are you sure you want to delete "${t.name}"? This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await deleteTemplate(t.id);
      if (previewId === t.id) setPreviewId(null);
      load();
    } catch {
      setError('Could not delete that template.');
    }
  }

  return (
    <div>
      <p className="section-intro">
        Browse the approved NCA template suite. Brand and content approval sit with the design and
        NCA sign-off teams — this library surfaces what's already approved.
      </p>

      <Card
        title="Template Library"
        eyebrow={`${visible.length} of ${templates.length} templates`}
        actions={
          <button className="btn btn--primary" onClick={() => navigate('/templates/new')}>
            + Create template
          </button>
        }
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: '1 1 320px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="tpl-search"
                placeholder="Search templates by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 28 }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36 }}>
              <label htmlFor="tpl-sort" style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                Sort:
              </label>
              <select
                id="tpl-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                style={{ height: 36, padding: '4px 10px', fontSize: 12.5 }}
              >
                <option value="updatedAt">Last updated</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p className="login__error">{error}</p>}

        {loading ? (
          <p className="section-intro">Loading templates…</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Template Name</th>
                  <th style={{ width: 140 }}>Last updated</th>
                  <th style={{ textAlign: 'right', minWidth: 280 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.name}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {formatDate(t.updatedAt)}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <button
                          className="btn btn--primary"
                          onClick={() => navigate(`/campaigns?templateId=${t.id}`)}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          title="Create a campaign with this template"
                        >
                          Use in campaign
                        </button>
                        <button
                          className="btn"
                          onClick={() => setPreviewId(t.id)}
                          style={{ padding: '4px 9px', fontSize: 12 }}
                          title="Preview template"
                        >
                          Preview
                        </button>
                        <button
                          className="btn"
                          onClick={() => navigate(`/templates/${t.id}/edit`)}
                          style={{ padding: '4px 9px', fontSize: 12 }}
                          title="Edit template"
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleDuplicate(t.id)}
                          style={{ padding: '4px 9px', fontSize: 12 }}
                          title="Duplicate template"
                        >
                          Duplicate
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleDelete(t)}
                          style={{ padding: '4px 9px', fontSize: 12 }}
                          title="Delete template"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--alert)';
                            e.currentTarget.style.borderColor = 'var(--alert)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '';
                            e.currentTarget.style.borderColor = '';
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-state">
                      {query ? `No templates found matching "${query}".` : 'No templates added yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {previewTemplate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${previewTemplate.name}`}
          onClick={() => setPreviewId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface, #fff)',
              borderRadius: 8,
              width: 'min(900px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 20,
              position: 'relative',
            }}
          >
            <button
              className="btn"
              onClick={() => setPreviewId(null)}
              aria-label="Close preview"
              style={{ position: 'absolute', top: 12, right: 12 }}
            >
              Close
            </button>

            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Preview — {previewTemplate.name}</h3>
            <p className="card__eyebrow" style={{ marginBottom: 12 }}>
              Responsive / device & client preview
            </p>

            <p style={{ marginBottom: 4 }}>
              <strong>Subject:</strong> {previewTemplate.subjectPreview || '(no subject)'}
            </p>
            <iframe
              title={`Rendered preview of ${previewTemplate.name}`}
              srcDoc={previewTemplate.bodyPreview}
              sandbox="allow-same-origin"
              style={{
                width: '100%',
                height: 400,
                border: '1px solid var(--rule, #ccc)',
                borderRadius: 4,
                marginTop: 8,
                backgroundColor: '#fff',
              }}
            />

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              {PREVIEW_TARGETS.map((target) => (
                <div
                  key={target.label}
                  style={{
                    width: Math.min(target.widthPx, 200),
                    border: '1px solid var(--rule, #ccc)',
                    borderRadius: 4,
                    padding: 10,
                    overflow: 'hidden',
                  }}
                >
                  <p className="card__eyebrow" style={{ marginBottom: 6 }}>
                    {target.label}
                  </p>
                  <div
                    style={{
                      width: target.widthPx,
                      transform: `scale(${Math.min(target.widthPx, 200) / target.widthPx})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <iframe
                      title={`${target.label} preview of ${previewTemplate.name}`}
                      srcDoc={previewTemplate.bodyPreview}
                      sandbox="allow-same-origin"
                      style={{
                        width: target.widthPx,
                        height: 260,
                        border: 'none',
                        backgroundColor: '#fff',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {previewTemplate.mergeFields.length > 0 && (
              <p style={{ marginTop: 12, fontSize: 13 }}>
                <strong>Merge fields:</strong> {previewTemplate.mergeFields.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}