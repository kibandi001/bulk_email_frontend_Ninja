import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
  TEMPLATE_CATEGORIES,
  PREVIEW_TARGETS,
} from '../../services/templateService';
import { LOCALE } from '../../config/constants';
import type { EmailTemplate, TemplateCategory } from '../../types';
import { Card } from '../../components/ui/Card';

type SortKey = 'name' | 'updatedAt';

export function TemplateLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    listTemplates()
      .then(setTemplates)
      .catch(() => setError('Could not load templates.'));
  }

  useEffect(load, []);

  const visible = useMemo(() => {
    const filtered = templates.filter((t) => {
      const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'all' || t.category === category;
      return matchesQuery && matchesCategory;
    });
    return [...filtered].sort((a, b) =>
      sortKey === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [templates, query, category, sortKey]);

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
            <label htmlFor="tpl-category">Category</label>
            <select
              id="tpl-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory | 'all')}
            >
              <option value="all">All categories</option>
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.category}</td>
                <td className="mono">{new Date(t.updatedAt).toLocaleDateString(LOCALE)}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => setPreviewId(previewId === t.id ? null : t.id)}>
                    {previewId === t.id ? 'Hide preview' : 'Preview'}
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
      </Card>

      {previewTemplate && (
        <Card title={`Preview — ${previewTemplate.name}`} eyebrow="Responsive / device & client preview">
          <p style={{ marginBottom: 4 }}>
            <strong>Subject:</strong> {previewTemplate.subjectPreview}
          </p>
          <p className="section-intro" style={{ marginTop: 0 }}>
            {previewTemplate.bodyPreview}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {PREVIEW_TARGETS.map((target) => (
              <div
                key={target.label}
                style={{
                  width: Math.min(target.widthPx, 260),
                  border: '1px solid var(--rule, #ccc)',
                  borderRadius: 4,
                  padding: 10,
                }}
              >
                <p className="card__eyebrow" style={{ marginBottom: 6 }}>
                  {target.label}
                </p>
                <p style={{ fontSize: 12, margin: 0 }}>{previewTemplate.subjectPreview}</p>
              </div>
            ))}
          </div>
          {previewTemplate.mergeFields.length > 0 && (
            <p style={{ marginTop: 12, fontSize: 13 }}>
              <strong>Merge fields:</strong> {previewTemplate.mergeFields.join(', ')}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
