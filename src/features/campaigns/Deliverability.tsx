// import { useEffect, useState } from 'react';
// import { listDeliverabilityChecks } from '../../services/campaignService';
// import { LOCALE } from '../../config/constants';
// import type { DeliverabilityCheck } from '../../types';
// import { Card } from '../../components/ui/Card';

// export function Deliverability() {
//   const [checks, setChecks] = useState<DeliverabilityCheck[]>([]);

//   useEffect(() => {
//     listDeliverabilityChecks().then(setChecks);
//   }, []);

//   return (
//     <div>
//       <p className="section-intro">
//         Run a pre-send check to see spam score and predicted inbox placement before a campaign
//         goes out. Results are kept alongside the campaign for later reference.
//       </p>
//       <Card title="Recent checks" actions={<button className="btn btn--primary">Run new check</button>}>
//         <table className="data-table">
//           <thead>
//             <tr>
//               <th>Campaign</th>
//               <th>Spam score</th>
//               <th>Inbox placement</th>
//               <th>Run at</th>
//             </tr>
//           </thead>
//           <tbody>
//             {checks.map((c) => (
//               <tr key={c.id}>
//                 <td>{c.campaignName}</td>
//                 <td className="mono">{c.spamScore.toFixed(1)} / 10</td>
//                 <td className="mono">{c.inboxPlacementPct}%</td>
//                 <td className="mono">{new Date(c.runAt).toLocaleString(LOCALE)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </Card>
//     </div>
//   );
// }
