import './QuotaBar.css';
import { QUOTA_THRESHOLDS } from '../../config/constants';
import type { QuotaMetric } from '../../types';

export function QuotaBar({ metric }: { metric: QuotaMetric }) {
  const pct = Math.min(100, Math.round((metric.used / metric.limit) * 100));
  const tone =
    pct >= QUOTA_THRESHOLDS.CRITICAL ? 'alert' : pct >= QUOTA_THRESHOLDS.WARNING ? 'amber' : 'verified';
  return (
    <div className="quota">
      <div className="quota__row">
        <span className="quota__label">{metric.label}</span>
        <span className="quota__value">
          {metric.used.toLocaleString()} / {metric.limit.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="quota__track">
        <div className={`quota__fill quota__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
