import { useEffect, useState } from 'react';
import { getQuota } from '../../services/adminService';
import type { QuotaMetric } from '../../types';
import { Card } from '../../components/ui/Card';
import { QuotaBar } from '../../components/ui/QuotaBar';
import { QUOTA_THRESHOLDS } from '../../config/constants';

export function Quota() {
  const [quota, setQuota] = useState<QuotaMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getQuota()
      .then(setQuota)
      .catch(() => setError('Could not load quota usage.'));
  }, []);

  const alerts = quota.filter(
    (m) => m.limit > 0 && (m.used / m.limit) * 100 >= QUOTA_THRESHOLDS.WARNING,
  );

  return (
    <div>
      <p className="section-intro">
        Nominated administrators are alerted automatically at 80%, 90% and 100% of any account
        limit. Levels below reflect current usage against the tenant's provisioned capacity.
      </p>
      {error && <div className="empty-state">{error}</div>}
      {alerts.length > 0 && (
        <Card title="Active alerts">
          {alerts.map((m) => (
            <p key={m.label}>
              {m.label} is at {Math.round((m.used / m.limit) * 100)}% of its limit.
            </p>
          ))}
        </Card>
      )}
      <Card title="Current usage">
        {quota.map((m) => (
          <QuotaBar key={m.label} metric={m} />
        ))}
      </Card>
    </div>
  );
}

// export function Quota() {
//   const [quota, setQuota] = useState<QuotaMetric[]>([]);

//   useEffect(() => {
//     getQuota().then(setQuota);
//   }, []);

//   return (
//     <div>
//       <p className="section-intro">
//         Nominated administrators are alerted automatically at 80%, 90% and 100% of any account
//         limit. Levels below reflect current usage against the tenant's provisioned capacity.
//       </p>
//       <Card title="Current usage">
//         {quota.map((m) => (
//           <QuotaBar key={m.label} metric={m} />
//         ))}
//       </Card>
//     </div>
//   );
// }
