import { useEffect, useState } from 'react';
import { PERMISSIONS, listRoles } from '../../services/adminService';
import type { RoleDefinition } from '../../types';
import { Card } from '../../components/ui/Card';

export function Roles() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);

  useEffect(() => {
    listRoles().then(setRoles);
  }, []);

  return (
    <div>
      <p className="section-intro">
        What each access profile can do across the console. Changes here apply immediately to
        every user assigned that role.
      </p>
      <Card title="Permissions matrix" actions={<button className="btn btn--primary">Save changes</button>}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Permission</th>
                {roles.map((r) => (
                  <th key={r.role} style={{ textAlign: 'center' }}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm) => (
                <tr key={perm.key}>
                  <td>{perm.label}</td>
                  {roles.map((r) => (
                    <td key={r.role} style={{ textAlign: 'center' }}>
                      <input type="checkbox" defaultChecked={r.permissions[perm.key]} disabled={r.role === 'admin'} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
          The Administrator profile always has full access and can't be edited here.
        </p>
      </Card>
    </div>
  );
}
