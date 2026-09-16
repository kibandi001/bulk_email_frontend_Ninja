// import { useEffect, useState } from 'react';
// import { listContacts } from '../../services/contactService';
// import type { Contact } from '../../types';
// import { Card } from '../../components/ui/Card';
// import { StatusBadge } from '../../components/ui/StatusBadge';

// export function Consent() {
//   const [contacts, setContacts] = useState<Contact[]>([]);

//   useEffect(() => {
//     listContacts().then(setContacts);
//   }, []);

//   const counts = contacts.reduce<Record<string, number>>((acc, c) => {
//     acc[c.consent] = (acc[c.consent] ?? 0) + 1;
//     return acc;
//   }, {});

//   return (
//     <div>
//       <p className="section-intro">
//         Consent is evaluated at send time — a contact without a current recorded lawful basis
//         cannot be sent to, regardless of the list they appear on.
//       </p>

//       <div className="grid grid--3" style={{ marginBottom: 18 }}>
//         {(['granted', 'pending', 'unsubscribed', 'bounced'] as const).map((status) => (
//           <Card key={status} eyebrow="Consent status" title={status[0].toUpperCase() + status.slice(1)}>
//             <div className="stat">
//               <span className="stat__value">{counts[status] ?? 0}</span>
//               <span className="stat__label">contacts</span>
//             </div>
//           </Card>
//         ))}
//       </div>

//       <Card title="Recent consent changes">
//         <table className="data-table">
//           <thead>
//             <tr>
//               <th>Contact</th>
//               <th>Status</th>
//               <th>Last activity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {contacts.map((c) => (
//               <tr key={c.id}>
//                 <td>{c.name} <span style={{ color: 'var(--muted)' }}>· {c.email}</span></td>
//                 <td><StatusBadge status={c.consent} /></td>
//                 <td className="mono">{c.lastActivity}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </Card>
//     </div>
//   );
// }
