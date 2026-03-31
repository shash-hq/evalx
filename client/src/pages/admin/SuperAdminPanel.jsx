import { Link } from 'react-router-dom';
import AdminPanel from './AdminPanel.jsx';

export default function SuperAdminPanel() {
  return (
    <div className="space-y-8">
      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'ACCESS CONTROL',
              body: 'Own staff roles, escalation paths, and least-privilege boundaries.',
            },
            {
              title: 'PLATFORM HEALTH',
              body: 'Track judges, queues, mail, payments, and production readiness from one place.',
            },
            {
              title: 'AUDIT & GOVERNANCE',
              body: 'Keep privileged actions attributable and separate platform governance from daily moderation.',
            },
          ].map((card) => (
            <div key={card.title} className="card p-5">
              <div className="font-mono text-xs text-muted mb-2">{card.title}</div>
              <p className="font-body text-sm text-text-secondary">{card.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 font-mono text-xs text-muted">
          Admin moderation stays at{' '}
          <Link to="/admin" className="text-accent hover:underline">
            /admin
          </Link>
          . SuperAdmin owns staff access and platform governance.
        </div>
      </div>

      <AdminPanel mode="superadmin" />
    </div>
  );
}
