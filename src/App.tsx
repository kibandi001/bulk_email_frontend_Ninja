import type { ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import { AppLayout } from './components/layout/AppLayout';

import { Login } from './features/auth/Login';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { AcceptInvitation } from './features/auth/AcceptInvitation';
import { NotFound } from './features/auth/NotFound';

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
import { Roles } from './features/administration/Roles';
import { SystemStatus } from './features/administration/SystemStatus';

import { Messages } from './features/message-log/Messages';

import { Reports } from './features/reports/Reports';

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

function RequireRole({
  roles,
  children,
}: {
  roles?: UserRole[];
  children: ReactNode;
}) {
  const { hasRole } = useAuth();

  if (roles && !hasRole(...roles)) {
    return (
      <NotFound
        statusCode={403}
        title="Access restricted"
        message="Your account is signed in, but it does not have permission to open this page. Your session is still active."
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  /**
   * IMPORTANT:
   *
   * Do not decide that the user is logged out until AuthContext
   * has finished checking /me/.
   *
   * This prevents direct navigation to an invalid URL such as:
   *
   *     /campaign
   *
   * from displaying the Login screen.
   */
  // Session restoration happens silently. While the auth state is being
  // restored, keep the existing document mounted without exposing internal
  // authentication state to the user.
  if (loading) {
    return null;
  }

  /**
   * At this point session restoration has finished.
   *
   * If there is no valid session, show authentication-related routes.
   */
  if (!user) {
    return (
      <Routes>
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password/:token"
          element={<ResetPassword />}
        />

        <Route
          path="/accept-invitation/:token"
          element={<AcceptInvitation />}
        />

        <Route
          path="*"
          element={<Login />}
        />
      </Routes>
    );
  }

  const title = location.pathname.startsWith('/templates/')
    ? 'Template Library'
    : (TITLES[location.pathname] ?? 'NCA Bulk Email Console');

  return (
    <AppLayout title={title}>
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/campaigns"
          element={
            <RequireRole roles={['admin', 'user']}>
              <CampaignStudio />
            </RequireRole>
          }
        />

        <Route
          path="/templates"
          element={
            <RequireRole roles={['admin', 'user']}>
              <TemplateLibrary />
            </RequireRole>
          }
        />

        <Route
          path="/templates/new"
          element={
            <RequireRole roles={['admin', 'user']}>
              <TemplateEditor />
            </RequireRole>
          }
        />

        <Route
          path="/templates/:id/edit"
          element={
            <RequireRole roles={['admin', 'user']}>
              <TemplateEditor />
            </RequireRole>
          }
        />

        <Route
          path="/contacts"
          element={
            <RequireRole roles={['admin', 'user']}>
              <Contacts />
            </RequireRole>
          }
        />

        <Route
          path="/hygiene"
          element={<DataHygiene />}
        />

        <Route
          path="/analytics"
          element={<Analytics />}
        />

        <Route
          path="/reports"
          element={
            <RequireRole roles={['admin', 'user']}>
              <Reports />
            </RequireRole>
          }
        />

        <Route
          path="/messages"
          element={
            <RequireRole roles={['admin', 'user']}>
              <Messages />
            </RequireRole>
          }
        />

        <Route
          path="/quota"
          element={<Quota />}
        />

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
            <RequireRole roles={['admin', 'user']}>
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
            <RequireRole roles={['admin', 'user']}>
              <AuditLog />
            </RequireRole>
          }
        />

        <Route
          path="/status"
          element={<SystemStatus />}
        />

        {/*
          IMPORTANT:
          Any authenticated URL that doesn't exist reaches this route.
          
          Example:
            /campaign
            /foo
            /something-invalid
          
          It shows the NotFound page and DOES NOT log the user out.
        */}
        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </AppLayout>
  );
}