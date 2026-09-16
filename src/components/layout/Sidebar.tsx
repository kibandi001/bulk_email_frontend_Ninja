// import { NavLink } from 'react-router-dom';
// import { useAuth } from '../../context/AuthContext';
// import type { UserRole } from '../../types';
// import './Sidebar.css';

// interface NavItem {
//   to: string;
//   label: string;
//   roles?: UserRole[];
// }

// interface NavGroup {
//   label: string;
//   items: NavItem[];
// }

// const GROUPS: NavGroup[] = [
//   {
//     label: 'Overview',
//     items: [{ to: '/', label: 'Dashboard' }],
//   },
//   {
//     label: 'Campaigns',
//     items: [
//       { to: '/campaigns', label: 'Campaign Studio', roles: ['admin', 'campaign_manager'] },
//       { to: '/scheduler', label: 'Scheduler', roles: ['admin', 'campaign_manager'] },
//       { to: '/deliverability', label: 'Deliverability Testing', roles: ['admin', 'campaign_manager'] },
//     ],
//   },
//   {
//     label: 'Templates',
//     items: [{ to: '/templates', label: 'Template Library', roles: ['admin', 'campaign_manager'] }],
//   },
//   {
//     label: 'Audience',
//     items: [
//       { to: '/contacts', label: 'Contacts & Lists', roles: ['admin', 'campaign_manager'] },
//       { to: '/consent', label: 'Consent Centre', roles: ['admin', 'campaign_manager', 'auditor'] },
//       { to: '/hygiene', label: 'Data Hygiene', roles: ['admin', 'campaign_manager', 'auditor'] },
//     ],
//   },
//   {
//     label: 'Insight',
//     items: [
//       { to: '/analytics', label: 'Analytics' },
//       { to: '/reports', label: 'Reports', roles: ['admin', 'campaign_manager', 'auditor'] },
//       { to: '/messages', label: 'Message Log', roles: ['admin', 'campaign_manager', 'auditor'] },
//     ],
//   },
//   {
//     label: 'Administration',
//     items: [
//       { to: '/quota', label: 'Quota & Alerts' },
//       { to: '/users', label: 'User Administration', roles: ['admin'] },
//       { to: '/companies', label: 'Companies', roles: ['admin'] },
//       { to: '/wallets', label: 'Wallets', roles: ['admin'] },
//       { to: '/request-logs', label: 'Request Logs', roles: ['admin', 'auditor'] },
//       { to: '/roles', label: 'Roles & Permissions', roles: ['admin'] },
//       { to: '/audit', label: 'Audit Log', roles: ['admin', 'auditor'] },
//       { to: '/status', label: 'System Status' },
//     ],
//   },
// ];

// export function Sidebar() {
//   const { hasRole } = useAuth();

//   return (
//     <nav className="sidebar" aria-label="Primary">
//       <div className="sidebar__brand">
//         <span className="sidebar__brand-mark">NCA</span>
//         <div>
//           <p className="sidebar__brand-title">Bulk Email Console</p>
//           <p className="sidebar__brand-sub">mail.nca.go.ke</p>
//         </div>
//       </div>

//       {GROUPS.map((group) => {
//         const visibleItems = group.items.filter((item) => !item.roles || hasRole(...item.roles));
//         if (visibleItems.length === 0) return null;
//         return (
//           <div className="sidebar__group" key={group.label}>
//             <p className="sidebar__group-label">{group.label}</p>
//             {visibleItems.map((item) => (
//               <NavLink
//                 key={item.to}
//                 to={item.to}
//                 className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
//                 end={item.to === '/'}
//               >
//                 {item.label}
//               </NavLink>
//             ))}
//           </div>
//         );
//       })}
//     </nav>
//   );
// }

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import './Sidebar.css';

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard' }],
  },
  {
    label: 'Campaigns',
    items: [{ to: '/campaigns', label: 'Campaign Studio', roles: ['admin', 'campaign_manager'] }],
  },
  {
    label: 'Templates',
    items: [{ to: '/templates', label: 'Template Library', roles: ['admin', 'campaign_manager'] }],
  },
  {
    label: 'Audience',
    items: [
      { to: '/contacts', label: 'Contacts & Lists', roles: ['admin', 'campaign_manager'] },
      { to: '/hygiene', label: 'Data Hygiene', roles: ['admin', 'campaign_manager', 'auditor'] },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/analytics', label: 'Analytics' },
      { to: '/reports', label: 'Reports', roles: ['admin', 'campaign_manager', 'auditor'] },
      { to: '/messages', label: 'Message Log', roles: ['admin', 'campaign_manager', 'auditor'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/quota', label: 'Quota & Alerts' },
      { to: '/users', label: 'User Administration', roles: ['admin'] },
      { to: '/companies', label: 'Companies', roles: ['admin'] },
      { to: '/wallets', label: 'Wallets', roles: ['admin'] },
      { to: '/request-logs', label: 'Request Logs', roles: ['admin', 'auditor'] },
      { to: '/roles', label: 'Roles & Permissions', roles: ['admin'] },
      { to: '/audit', label: 'Audit Log', roles: ['admin', 'auditor'] },
      { to: '/status', label: 'System Status' },
    ],
  },
];

export function Sidebar() {
  const { hasRole } = useAuth();

  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">NCA</span>
        <div>
          <p className="sidebar__brand-title">Bulk Email Console</p>
          <p className="sidebar__brand-sub">mail.nca.go.ke</p>
        </div>
      </div>

      {GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => !item.roles || hasRole(...item.roles));
        if (visibleItems.length === 0) return null;
        return (
          <div className="sidebar__group" key={group.label}>
            <p className="sidebar__group-label">{group.label}</p>
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                end={item.to === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
