import { useEffect, useState } from 'react';
import { getQuota } from '../../services/adminService';
import type { QuotaMetric } from '../../types';
import { Card } from '../../components/ui/Card';
import { QuotaBar } from '../../components/ui/QuotaBar';

export function Quota() {
  const [quota, setQuota] = useState<QuotaMetric[]>([]);

  useEffect(() => {
    getQuota().then(setQuota);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Nominated administrators are alerted automatically at 80%, 90% and 100% of any account
        limit. Levels below reflect current usage against the tenant's provisioned capacity.
      </p>
      <Card title="Current usage">
        {quota.map((m) => (
          <QuotaBar key={m.label} metric={m} />
        ))}
      </Card>
    </div>
  );
}
