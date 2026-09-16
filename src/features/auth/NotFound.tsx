import { Link, useLocation } from 'react-router-dom';

interface NotFoundProps {
  title?: string;
  message?: string;
  statusCode?: 403 | 404;
}

export function NotFound({
  title = 'Page not found',
  message = "The page you're looking for doesn't exist or may have moved.",
  statusCode = 404,
}: NotFoundProps) {
  const location = useLocation();

  return (
    <div className="empty-state" style={{ maxWidth: 680, margin: '64px auto', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.65 }}>
        ERROR {statusCode}
      </div>
      <h1 style={{ margin: '8px 0 10px' }}>{title}</h1>
      <p style={{ margin: '0 auto 18px', maxWidth: 520 }}>{message}</p>
      <p className="mono" style={{ marginBottom: 22, opacity: 0.6 }}>
        {location.pathname}
      </p>
      <Link className="btn" to="/">
        Return to dashboard
      </Link>
    </div>
  );
}
