import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function TemplateLibrary() {
  const navigate = useNavigate();
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
      .catch(() => setError('Could not load templates.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

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
    const filtered = templates.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
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
    <div>
      <p className="section-intro">
        Browse the approved NCA template suite. Brand and content approval sit with the design and
        NCA sign-off teams — this library surfaces what's already approved.
      </p>

      <Card
        title="Template Library"
        eyebrow={`${visible.length} of ${templates.length}`}
        actions={
          <button className="btn btn--primary" onClick={() => navigate('/templates/new')}>
            Create template
          </button>
        }
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 220px', margin: 0 }}>
            <label htmlFor="tpl-search">Search</label>
            <input
              id="tpl-search"
              placeholder="Search by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="tpl-sort">Sort by</label>
            <select id="tpl-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="updatedAt">Last updated</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {error && <p className="login__error">{error}</p>}

        {loading ? (
          <p className="section-intro">Loading templates…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Last updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="mono">{new Date(t.updatedAt).toLocaleDateString(LOCALE)}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => setPreviewId(t.id)}>
                      Preview
                    </button>
                    <button className="btn" onClick={() => navigate(`/templates/${t.id}/edit`)}>
                      Edit
                    </button>
                    <button className="btn" onClick={() => handleDuplicate(t.id)}>
                      Duplicate
                    </button>
                    <button
                      className="btn btn--primary"
                      onClick={() => navigate(`/campaigns?templateId=${t.id}`)}
                    >
                      Use in campaign
                    </button>
                    <button className="btn" onClick={() => handleDelete(t.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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