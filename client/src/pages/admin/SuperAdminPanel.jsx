import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import AdminPanel from './AdminPanel.jsx';
import {
  getSuperAdminHealth,
  getAuditLogs,
} from '../../services/superAdminService.js';

const TABS = ['HEALTH', 'AUDIT', 'ACCESS'];

const STATUS_STYLES = {
  healthy: 'text-success border-success/30 bg-success/10',
  success: 'text-success border-success/30 bg-success/10',
  degraded: 'text-warning border-warning/30 bg-warning/10',
  down: 'text-error border-error/30 bg-error/10',
  failure: 'text-error border-error/30 bg-error/10',
  missing_config: 'text-warning border-warning/30 bg-warning/10',
};

const formatStatus = (value) =>
  String(value || 'unknown')
    .replace(/_/g, ' ')
    .toUpperCase();

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : '—';

export default function SuperAdminPanel() {
  const [tab, setTab] = useState('HEALTH');
  const [health, setHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'HEALTH') loadHealth();
    if (tab === 'AUDIT') loadAuditLogs();
  }, [tab]);

  const loadHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const {data} = await getSuperAdminHealth();
      setHealth(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load platform health');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const {data} = await getAuditLogs({limit: 25});
      setAuditLogs(data.data.logs);
      setAuditPagination(data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const serviceCards = health
    ? [
        {
          title: 'OVERALL',
          status: health.status,
          meta: `Checked ${formatDateTime(health.checkedAt)}`,
        },
        {
          title: 'DATABASE',
          status: health.services.database.status,
          meta: health.services.database.host || health.services.database.readyStateLabel,
        },
        {
          title: 'REDIS',
          status: health.services.redis.status,
          meta: health.services.redis.clientStatus || 'unknown',
        },
        {
          title: 'JUDGE',
          status: health.services.judge.status,
          meta: health.services.judge.baseUrl,
        },
        {
          title: 'MAIL',
          status: health.services.mail.status,
          meta: health.services.mail.from || 'sender not configured',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="mb-8">
          <div className="font-mono text-xs text-muted mb-1 tracking-widest">
            // PLATFORM GOVERNANCE
          </div>
          <h1 className="font-display text-4xl font-bold tracking-widest uppercase">
            SUPERADMIN CONSOLE
          </h1>
          <p className="mt-3 max-w-3xl font-body text-sm text-text-secondary">
            Own staff access, runtime readiness, and privileged activity review from one place.
            Daily moderation stays in{' '}
            <Link to="/admin" className="text-accent hover:underline">
              /admin
            </Link>
            .
          </p>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-5 py-3 font-mono text-xs tracking-widest transition-colors ${
                tab === item
                  ? 'text-accent border-b border-accent -mb-px'
                  : 'text-muted hover:text-text-primary'
              }`}>
              {item}
            </button>
          ))}
        </div>

        {error && (
          <div className="border border-error/30 bg-error/10 px-4 py-3 font-mono text-sm text-error mb-4">
            {error}
          </div>
        )}

        {tab === 'HEALTH' && (
          <div className="space-y-6">
            {loading ? (
              <div className="font-mono text-sm text-muted">CHECKING PLATFORM...</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {serviceCards.map((card) => (
                    <div key={card.title} className="card p-5">
                      <div className="font-mono text-xs text-muted mb-2">{card.title}</div>
                      <span
                        className={`inline-flex border px-2 py-1 font-mono text-xs ${
                          STATUS_STYLES[card.status] || 'text-text-secondary border-border'
                        }`}>
                        {formatStatus(card.status)}
                      </span>
                      <div className="mt-3 font-body text-sm text-text-secondary break-words">
                        {card.meta}
                      </div>
                    </div>
                  ))}
                </div>

                {health && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="card p-5">
                      <div className="font-mono text-xs text-muted mb-4">
                        QUEUE SNAPSHOT
                      </div>
                      <div className="space-y-4">
                        {Object.entries(health.services.queues).map(([queueName, snapshot]) => (
                          <div key={queueName} className="border border-border/60 p-4">
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <div className="font-mono text-xs text-text-primary uppercase">
                                {queueName}
                              </div>
                              <span
                                className={`inline-flex border px-2 py-1 font-mono text-xs ${
                                  STATUS_STYLES[snapshot.status] || 'text-text-secondary border-border'
                                }`}>
                                {formatStatus(snapshot.status)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-xs text-text-secondary">
                              {snapshot.counts
                                ? Object.entries(snapshot.counts).map(([label, value]) => (
                                    <div key={label} className="flex justify-between gap-3">
                                      <span>{label.toUpperCase()}</span>
                                      <span className="text-text-primary">{value}</span>
                                    </div>
                                  ))
                                : (
                                  <div className="text-error">{snapshot.error || 'Queue probe failed'}</div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-5">
                      <div className="font-mono text-xs text-muted mb-4">
                        DEPENDENCY DETAILS
                      </div>
                      <div className="space-y-4 font-body text-sm text-text-secondary">
                        <div>
                          <div className="font-mono text-xs text-text-primary mb-1">API</div>
                          <div>
                            {health?.services.api.nodeEnv} · uptime {health?.services.api.uptimeSeconds}s
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-text-primary mb-1">DATABASE</div>
                          <div>
                            {health?.services.database.host || 'unknown host'} ·{' '}
                            {health?.services.database.readyStateLabel}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-text-primary mb-1">REDIS</div>
                          <div>
                            {health?.services.redis.clientStatus || 'unknown'} ·{' '}
                            {health?.services.redis.latencyMs ?? '—'}ms
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-text-primary mb-1">JUDGE</div>
                          <div>
                            {health?.services.judge.baseUrl} · cached languages{' '}
                            {health?.services.judge.cachedLanguageCount}
                          </div>
                          {health?.services.judge.error && (
                            <div className="mt-1 text-error">{health.services.judge.error}</div>
                          )}
                        </div>
                        <div>
                          <div className="font-mono text-xs text-text-primary mb-1">MAIL</div>
                          <div>
                            {health?.services.mail.from || 'sender missing'} · last success{' '}
                            {formatDateTime(health?.services.mail.lastSuccessfulAt)}
                          </div>
                          {health?.services.mail.lastErrorMessage && (
                            <div className="mt-1 text-error">
                              {health.services.mail.lastErrorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'AUDIT' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 font-mono text-sm text-muted">LOADING AUDIT LOGS...</div>
            ) : auditLogs.length > 0 ? (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['TIME', 'ACTOR', 'ACTION', 'TARGET', 'STATUS', 'DETAILS'].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left font-mono text-xs text-muted">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b border-border/50 align-top hover:bg-base transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-text-primary">
                          <div>{log.actorName || 'Unknown actor'}</div>
                          <div className="font-mono text-xs text-text-secondary">
                            {log.actorEmail || 'no-email'} · {log.actorRole || 'unknown-role'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-primary">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-text-secondary">
                          <div>{log.targetLabel || log.targetId || '—'}</div>
                          <div className="font-mono text-xs text-muted">
                            {log.targetType || 'no-target'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex border px-2 py-1 font-mono text-xs ${
                              STATUS_STYLES[log.status] || 'text-text-secondary border-border'
                            }`}>
                            {formatStatus(log.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(log.details || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 font-mono text-xs text-muted border-t border-border">
                  Showing {auditLogs.length} entries · total {auditPagination?.total || auditLogs.length}
                </div>
              </>
            ) : (
              <div className="px-4 py-8 font-mono text-sm text-muted">
                No audit events recorded yet.
              </div>
            )}
          </div>
        )}

        {tab === 'ACCESS' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'ACCESS CONTROL',
                  body: 'Staff roles are managed here, while lower-privilege admins stay focused on contest moderation.',
                },
                {
                  title: 'PLATFORM HEALTH',
                  body: 'Operational readiness belongs next to governance so incidents and privilege decisions stay visible together.',
                },
                {
                  title: 'AUDIT & GOVERNANCE',
                  body: 'Every privileged mutation should be attributable before we add deeper controls like feature flags or maintenance switches.',
                },
              ].map((card) => (
                <div key={card.title} className="card p-5">
                  <div className="font-mono text-xs text-muted mb-2">{card.title}</div>
                  <p className="font-body text-sm text-text-secondary">{card.body}</p>
                </div>
              ))}
            </div>

            <AdminPanel mode="superadmin" />
          </div>
        )}
      </div>
    </div>
  );
}
