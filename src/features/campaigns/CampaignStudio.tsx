// import { useEffect, useState } from 'react';
// import { Link, useSearchParams } from 'react-router-dom';
// import { listCampaigns } from '../../services/campaignService';
// import { listTemplates } from '../../services/templateService';
// import type { Campaign, EmailTemplate } from '../../types';
// import { Card } from '../../components/ui/Card';
// import { StatusBadge } from '../../components/ui/StatusBadge';

// export function CampaignStudio() {
//   const [searchParams] = useSearchParams();
//   const [campaigns, setCampaigns] = useState<Campaign[]>([]);
//   const [templates, setTemplates] = useState<EmailTemplate[]>([]);
//   const [name, setName] = useState('');
//   const [subject, setSubject] = useState('');
//   const [templateId, setTemplateId] = useState<string>('');
//   const [abTest, setAbTest] = useState(false);

//   useEffect(() => {
//     listCampaigns().then(setCampaigns);
//   }, []);

//   useEffect(() => {
//     listTemplates().then((loaded) => {
//       setTemplates(loaded);
//       const requested = searchParams.get('templateId');
//       const initial = loaded.find((t) => t.id === requested) ?? loaded[0];
//       if (initial) {
//         setTemplateId(initial.id);
//         if (!subject) setSubject(initial.subjectPreview);
//       }
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [searchParams]);

//   const selectedTemplate = templates.find((t) => t.id === templateId);

//   return (
//     <div>
//       <p className="section-intro">
//         Build, preview and manage campaigns sent from mail.nca.ke. New campaigns start as
//         drafts and move to the Scheduler once content and audience are confirmed.
//       </p>

//       {selectedTemplate && searchParams.get('templateId') && (
//         <p className="section-intro" style={{ marginTop: -8 }}>
//           Starting from <strong>{selectedTemplate.name}</strong> — customize the content below, or{' '}
//           <Link to="/templates">choose a different template</Link>.
//         </p>
//       )}

//       <div className="grid grid--2">
//         <Card title="All campaigns">
//           <table className="data-table">
//             <thead>
//               <tr>
//                 <th>Name</th>
//                 <th>Status</th>
//                 <th>Recipients</th>
//               </tr>
//             </thead>
//             <tbody>
//               {campaigns.map((c) => (
//                 <tr key={c.id}>
//                   <td>{c.name}</td>
//                   <td><StatusBadge status={c.status} /></td>
//                   <td className="mono">{c.recipients.toLocaleString()}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </Card>

//         <Card title="New campaign" eyebrow="Draft">
//           <div className="field">
//             <label htmlFor="cname">Campaign name</label>
//             <input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contractor Registration Update" />
//           </div>
//           <div className="field">
//             <label htmlFor="subj">Subject line</label>
//             <input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What recipients see in their inbox" />
//           </div>
//           <div className="field">
//             <label htmlFor="tpl">Template</label>
//             <select
//               id="tpl"
//               value={templateId}
//               onChange={(e) => {
//                 setTemplateId(e.target.value);
//                 const t = templates.find((tp) => tp.id === e.target.value);
//                 if (t) setSubject(t.subjectPreview);
//               }}
//             >
//               {templates.map((t) => (
//                 <option key={t.id} value={t.id}>
//                   {t.name}
//                 </option>
//               ))}
//             </select>
//             <p style={{ fontSize: 12, marginTop: 4 }}>
//               <Link to="/templates">Browse the full template library</Link>
//             </p>
//           </div>
//           <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
//             <input id="ab" type="checkbox" checked={abTest} onChange={(e) => setAbTest(e.target.checked)} style={{ width: 'auto' }} />
//             <label htmlFor="ab" style={{ margin: 0 }}>Run an A/B test on subject line</label>
//           </div>
//           <button className="btn btn--primary" type="button">
//             Open in designer
//           </button>
//         </Card>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listCampaigns } from '../../services/campaignService';
import { listTemplates } from '../../services/templateService';
import type { Campaign, EmailTemplate } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function CampaignStudio() {
  const [searchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [abTest, setAbTest] = useState(false);

  useEffect(() => {
    listCampaigns().then(setCampaigns);
  }, []);

  useEffect(() => {
    listTemplates().then((loaded) => {
      setTemplates(loaded);
      const requested = searchParams.get('templateId');
      const initial = loaded.find((t) => t.id === requested) ?? loaded[0];
      if (initial) {
        setTemplateId(initial.id);
        if (!subject) setSubject(initial.subjectPreview);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div>
      <p className="section-intro">
        Build, preview and manage campaigns sent from mail.nca.ke. New campaigns start as
        drafts and move to Queued once content and audience are confirmed.
      </p>

      {selectedTemplate && searchParams.get('templateId') && (
        <p className="section-intro" style={{ marginTop: -8 }}>
          Starting from <strong>{selectedTemplate.name}</strong> — customize the content below, or{' '}
          <Link to="/templates">choose a different template</Link>.
        </p>
      )}

      <div className="grid grid--2">
        <Card title="All campaigns">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Recipients</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="mono">{c.recipients.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="New campaign" eyebrow="Draft">
          <div className="field">
            <label htmlFor="cname">Campaign name</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contractor Registration Update" />
          </div>
          <div className="field">
            <label htmlFor="subj">Subject line</label>
            <input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What recipients see in their inbox" />
          </div>
          <div className="field">
            <label htmlFor="tpl">Template</label>
            <select
              id="tpl"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const t = templates.find((tp) => tp.id === e.target.value);
                if (t) setSubject(t.subjectPreview);
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              <Link to="/templates">Browse the full template library</Link>
            </p>
          </div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input id="ab" type="checkbox" checked={abTest} onChange={(e) => setAbTest(e.target.checked)} style={{ width: 'auto' }} />
            <label htmlFor="ab" style={{ margin: 0 }}>Run an A/B test on subject line</label>
          </div>
          <button className="btn btn--primary" type="button">
            Open in designer
          </button>
        </Card>
      </div>
    </div>
  );
}
