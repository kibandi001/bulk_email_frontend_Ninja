import { useEffect, useState } from 'react';
import { getSystemStatus, listIncidents } from '../../services/adminService';
import { LOCALE } from '../../config/constants';
import type { StatusIncident, SystemStatusSnapshot } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusSnapshot[]>([]);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);

  useEffect(() => {
    getSystemStatus().then(setStatus);
    listIncidents().then(setIncidents);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Read-only view of platform health. This reflects signals the backend already tracks —
        nothing here is computed in the browser.
      </p>

      <div className="grid grid--2" style={{ marginBottom: 18 }}>
        {status.map((s) => (
          <Card key={s.service} title={s.service}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>{s.detail}</span>
              <StatusBadge status={s.status} />
            </div>
          </Card>
        ))}
      </div>

      <Card title="Recent incidents">
        <table className="data-table">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Occurred</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td className="mono">{new Date(i.occurredAt).toLocaleString(LOCALE)}</td>
                <td><StatusBadge status={i.resolved ? 'operational' : 'degraded'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
