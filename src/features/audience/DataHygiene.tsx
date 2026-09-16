import { useEffect, useState } from 'react';
import { listDataHygieneChecks } from '../../services/contactService';
import type { DataHygieneCheck } from '../../types';
import { Card } from '../../components/ui/Card';

export function DataHygiene() {
  const [checks, setChecks] = useState<DataHygieneCheck[]>([]);

  useEffect(() => {
    listDataHygieneChecks().then(setChecks);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Every import and every send is checked against these rules automatically. Reports below
        reflect the most recent run of each.
      </p>
      <div className="grid grid--3">
        {checks.map((r) => (
          <Card key={r.label} title={r.label}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5 }}>{r.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
