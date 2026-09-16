// import { useEffect, useState } from 'react';
// import { listCampaigns } from '../../services/campaignService';
// import { LOCALE } from '../../config/constants';
// import type { Campaign } from '../../types';
// import { Card } from '../../components/ui/Card';
// import { StatusBadge } from '../../components/ui/StatusBadge';

// export function Scheduler() {
//   const [campaigns, setCampaigns] = useState<Campaign[]>([]);

//   useEffect(() => {
//     listCampaigns().then(setCampaigns);
//   }, []);

//   const scheduled = campaigns.filter((c) => c.status === 'scheduled' || c.status === 'sending');

//   return (
//     <div>
//       <p className="section-intro">
//         Campaigns queued for a specific date and time, or dispatching now. Triggered sends from
//         connected NCA applications appear here automatically.
//       </p>
//       <Card title="Queue">
//         {scheduled.length === 0 ? (
//           <div className="empty-state">Nothing scheduled right now.</div>
//         ) : (
//           <table className="data-table">
//             <thead>
//               <tr>
//                 <th>Campaign</th>
//                 <th>Status</th>
//                 <th>Send time</th>
//                 <th>Recipients</th>
//               </tr>
//             </thead>
//             <tbody>
//               {scheduled.map((c) => (
//                 <tr key={c.id}>
//                   <td>{c.name}</td>
//                   <td><StatusBadge status={c.status} /></td>
//                   <td className="mono">{c.scheduledFor ? new Date(c.scheduledFor).toLocaleString(LOCALE) : 'Dispatching'}</td>
//                   <td className="mono">{c.recipients.toLocaleString()}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </Card>
//     </div>
//   );
// }
