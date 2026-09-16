// import type { ReactNode } from 'react';
// import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
// import { useAuth } from './context/AuthContext';
// import { AppLayout } from './components/layout/AppLayout';
// import { Login } from './features/auth/Login';
// import { ForgotPassword } from './features/auth/ForgotPassword';
// import { ResetPassword } from './features/auth/ResetPassword';
// import { AcceptInvitation } from './features/auth/AcceptInvitation';
// import { Dashboard } from './features/dashboard/Dashboard';
// import { CampaignStudio } from './features/campaigns/CampaignStudio';
// import { Scheduler } from './features/campaigns/Scheduler';
// import { Deliverability } from './features/campaigns/Deliverability';
// import { TemplateLibrary } from './features/templates/TemplateLibrary';
// import { TemplateEditor } from './features/templates/TemplateEditor';
// import { Contacts } from './features/audience/Contacts';
// import { Consent } from './features/audience/Consent';
// import { DataHygiene } from './features/audience/DataHygiene';
// import { Analytics } from './features/insight/Analytics';
// import { Quota } from './features/administration/Quota';
// import { Users } from './features/administration/Users';
// import { Companies } from './features/administration/Companies';
// import { Wallets } from './features/administration/Wallets';
// import { RequestLogs } from './features/administration/RequestLogs';
// import { AuditLog } from './features/administration/AuditLog';
// import { Messages } from './features/message-log/Messages';
// import { Reports } from './features/reports/Reports';
// import { Roles } from './features/administration/Roles';
// import { SystemStatus } from './features/administration/SystemStatus';
// import type { UserRole } from './types';

// const TITLES: Record<string, string> = {
//   '/': 'Dashboard',
//   '/campaigns': 'Campaign Studio',
//   '/scheduler': 'Scheduler',
//   '/deliverability': 'Deliverability Testing',
//   '/templates': 'Template Library',
//   '/contacts': 'Contacts & Lists',
//   '/consent': 'Consent Centre',
//   '/hygiene': 'Data Hygiene',
//   '/analytics': 'Analytics',
//   '/reports': 'Reports',
//   '/messages': 'Message Log',
//   '/quota': 'Quota & Alerts',
//   '/users': 'User Administration',
//   '/companies': 'Companies',
//   '/wallets': 'Wallets',
//   '/request-logs': 'Request Logs',
//   '/roles': 'Roles & Permissions',
//   '/audit': 'Audit Log',
//   '/status': 'System Status',
// };

// function RequireRole({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
//   const { hasRole } = useAuth();
//   if (roles && !hasRole(...roles)) {
//     return (
//       <div className="empty-state">
//         You don't have access to this area. Contact your NCA system administrator if you believe
//         this is incorrect.
//       </div>
//     );
//   }
//   return <>{children}</>;
// }

// export default function App() {
//   const { user } = useAuth();
//   const location = useLocation();

//   if (!user) {
//     return (
//       <Routes>
//         <Route path="/forgot-password" element={<ForgotPassword />} />
//         <Route path="/reset-password/:token" element={<ResetPassword />} />
//         <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
//         <Route path="*" element={<Login />} />
//       </Routes>
//     );
//   }

//   const title = location.pathname.startsWith('/templates/')
//     ? 'Template Library'
//     : (TITLES[location.pathname] ?? 'NCA Bulk Email Console');

//   return (
//     <AppLayout title={title}>
//       <Routes>
//         <Route path="/" element={<Dashboard />} />
//         <Route
//           path="/campaigns"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <CampaignStudio />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/scheduler"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <Scheduler />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/deliverability"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <Deliverability />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/templates"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <TemplateLibrary />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/templates/new"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <TemplateEditor />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/templates/:id/edit"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <TemplateEditor />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/contacts"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager']}>
//               <Contacts />
//             </RequireRole>
//           }
//         />
//         <Route path="/consent" element={<Consent />} />
//         <Route path="/hygiene" element={<DataHygiene />} />
//         <Route path="/analytics" element={<Analytics />} />
//         <Route
//           path="/reports"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager', 'auditor']}>
//               <Reports />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/messages"
//           element={
//             <RequireRole roles={['admin', 'campaign_manager', 'auditor']}>
//               <Messages />
//             </RequireRole>
//           }
//         />
//         <Route path="/quota" element={<Quota />} />
//         <Route
//           path="/users"
//           element={
//             <RequireRole roles={['admin']}>
//               <Users />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/companies"
//           element={
//             <RequireRole roles={['admin']}>
//               <Companies />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/wallets"
//           element={
//             <RequireRole roles={['admin']}>
//               <Wallets />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/request-logs"
//           element={
//             <RequireRole roles={['admin', 'auditor']}>
//               <RequestLogs />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/roles"
//           element={
//             <RequireRole roles={['admin']}>
//               <Roles />
//             </RequireRole>
//           }
//         />
//         <Route
//           path="/audit"
//           element={
//             <RequireRole roles={['admin', 'auditor']}>
//               <AuditLog />
//             </RequireRole>
//           }
//         />
//         <Route path="/status" element={<SystemStatus />} />
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </AppLayout>
//   );
// }

import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './features/auth/Login';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { AcceptInvitation } from './features/auth/AcceptInvitation';
import { Dashboard } from './features/dashboard/Dashboard';
import { CampaignStudio } from './features/campaigns/CampaignStudio';
import { TemplateLibrary } from './features/templates/TemplateLibrary';
import { TemplateEditor } from './features/templates/TemplateEditor';
import { Contacts } from './features/audience/Contacts';
import { DataHygiene } from './features/audience/DataHygiene';
import { Analytics } from './features/insight/Analytics';
import { Quota } from './features/administration/Quota';
import { Users } from './features/administration/Users';
import { Companies } from './features/administration/Companies';
import { Wallets } from './features/administration/Wallets';
import { RequestLogs } from './features/administration/RequestLogs';
import { AuditLog } from './features/administration/AuditLog';
import { Messages } from './features/message-log/Messages';
import { Reports } from './features/reports/Reports';
import { Roles } from './features/administration/Roles';
import { SystemStatus } from './features/administration/SystemStatus';
import type { UserRole } from './types';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/campaigns': 'Campaign Studio',
  '/templates': 'Template Library',
  '/contacts': 'Contacts & Lists',
  '/hygiene': 'Data Hygiene',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/messages': 'Message Log',
  '/quota': 'Quota & Alerts',
  '/users': 'User Administration',
  '/companies': 'Companies',
  '/wallets': 'Wallets',
  '/request-logs': 'Request Logs',
  '/roles': 'Roles & Permissions',
  '/audit': 'Audit Log',
  '/status': 'System Status',
};

function RequireRole({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles)) {
    return (
      <div className="empty-state">
        You don't have access to this area. Contact your NCA system administrator if you believe
        this is incorrect.
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const title = location.pathname.startsWith('/templates/')
    ? 'Template Library'
    : (TITLES[location.pathname] ?? 'NCA Bulk Email Console');

  return (
    <AppLayout title={title}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/campaigns"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <CampaignStudio />
            </RequireRole>
          }
        />
        <Route
          path="/templates"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <TemplateLibrary />
            </RequireRole>
          }
        />
        <Route
          path="/templates/new"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <TemplateEditor />
            </RequireRole>
          }
        />
        <Route
          path="/templates/:id/edit"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <TemplateEditor />
            </RequireRole>
          }
        />
        <Route
          path="/contacts"
          element={
            <RequireRole roles={['admin', 'campaign_manager']}>
              <Contacts />
            </RequireRole>
          }
        />
        <Route path="/hygiene" element={<DataHygiene />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route
          path="/reports"
          element={
            <RequireRole roles={['admin', 'campaign_manager', 'auditor']}>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/messages"
          element={
            <RequireRole roles={['admin', 'campaign_manager', 'auditor']}>
              <Messages />
            </RequireRole>
          }
        />
        <Route path="/quota" element={<Quota />} />
        <Route
          path="/users"
          element={
            <RequireRole roles={['admin']}>
              <Users />
            </RequireRole>
          }
        />
        <Route
          path="/companies"
          element={
            <RequireRole roles={['admin']}>
              <Companies />
            </RequireRole>
          }
        />
        <Route
          path="/wallets"
          element={
            <RequireRole roles={['admin']}>
              <Wallets />
            </RequireRole>
          }
        />
        <Route
          path="/request-logs"
          element={
            <RequireRole roles={['admin', 'auditor']}>
              <RequestLogs />
            </RequireRole>
          }
        />
        <Route
          path="/roles"
          element={
            <RequireRole roles={['admin']}>
              <Roles />
            </RequireRole>
          }
        />
        <Route
          path="/audit"
          element={
            <RequireRole roles={['admin', 'auditor']}>
              <AuditLog />
            </RequireRole>
          }
        />
        <Route path="/status" element={<SystemStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
