import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
} from '../../services/templateService';
import { LOCALE } from '../../config/constants';
import type { EmailTemplate } from '../../types';
import { Card } from '../../components/ui/Card';

type SortKey = 'name' | 'updatedAt';

// Slightly softened corners for every button on this page — enough to take the
// edge off the sharp default without looking pill-shaped. Change this one
// number to make them rounder or squarer.
const BTN_RADIUS = 6;
const roundedBtn = { borderRadius: BTN_RADIUS } as const;

// Plain-text / fragment templates (e.g. "Hello {{first_name}}") have no styles
// of their own, so the browser renders them tiny and serif. Wrap fragments in
// a minimal readable document; full HTML documents are passed through as-is.
function toPreviewDocument(body: string): string {
  if (/<html[\s>]/i.test(body)) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;padding:16px;margin:0}</style></head><body>${body}</body></html>`;
}

// Replace {{merge_fields}} with sample data so the preview looks realistic
function fillMergeFields(body: string): string {
  const sampleData: Record<string, string> = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
  };

  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return sampleData[key] !== undefined ? sampleData[key] : match;
  });
}

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
          <button
            className="btn btn--primary"
            style={roundedBtn}
            onClick={() => navigate('/templates/new')}
          >
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
                    <button className="btn" style={roundedBtn} onClick={() => setPreviewId(t.id)}>
                      Preview
                    </button>
                    <button
                      className="btn"
                      style={roundedBtn}
                      onClick={() => navigate(`/templates/${t.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button className="btn" style={roundedBtn} onClick={() => handleDuplicate(t.id)}>
                      Duplicate
                    </button>
                    <button
                      className="btn btn--primary"
                      style={roundedBtn}
                      onClick={() => navigate(`/campaigns?templateId=${t.id}`)}
                    >
                      Use in campaign
                    </button>
                    <button className="btn" style={roundedBtn} onClick={() => handleDelete(t.id)}>
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
              style={{ ...roundedBtn, position: 'absolute', top: 12, right: 12 }}
            >
              Close
            </button>

            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Preview — {previewTemplate.name}</h3>

            <p style={{ marginBottom: 4 }}>
              <strong>Subject:</strong>{' '}
              {previewTemplate.subjectPreview
                ? fillMergeFields(previewTemplate.subjectPreview)
                : '(no subject)'}
            </p>
            <iframe
              title={`Rendered preview of ${previewTemplate.name}`}
              srcDoc={toPreviewDocument(fillMergeFields(previewTemplate.bodyPreview || ''))}
              sandbox="allow-same-origin"
              style={{
                width: '100%',
                height: '60vh',
                border: '1px solid var(--rule, #ccc)',
                borderRadius: 4,
                marginTop: 8,
                backgroundColor: '#fff',
              }}
            />

            {previewTemplate.mergeFields && previewTemplate.mergeFields.length > 0 && (
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