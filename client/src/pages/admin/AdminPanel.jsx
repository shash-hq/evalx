import {useEffect, useState} from 'react';
import {
  getAdminStats,
  getAdminContests,
  getAdminUsers,
  approveContest,
  rejectContest,
  triggerClose,
  processPayouts,
  updateUserRole,
} from '../../services/adminService.js';
import ContestStatusBadge from '../../components/contest/ContestStatusBadge.jsx';

const TABS = ['STATS', 'CONTESTS', 'USERS'];

export default function AdminPanel() {
  const [tab, setTab] = useState('STATS');
  const [stats, setStats] = useState(null);
  const [contests, setContests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (tab === 'STATS') loadStats();
    if (tab === 'CONTESTS') loadContests();
    if (tab === 'USERS') loadUsers();
  }, [tab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const {data} = await getAdminStats();
      setStats(data.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const loadContests = async () => {
    setLoading(true);
    try {
      const {data} = await getAdminContests();
      setContests(data.data.contests);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const {data} = await getAdminUsers();
      setUsers(data.data.users);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (label, fn) => {
    setActionLoading(label);
    try {
      await fn();
      await loadContests();
    } catch (_) {
    } finally {
      setActionLoading('');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      await loadUsers();
    } catch (_) {}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="font-mono text-xs text-muted mb-1 tracking-widest">
          // SUPERUSER
        </div>
        <h1 className="font-display text-4xl font-bold tracking-widest uppercase">
          ADMIN PANEL
        </h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 font-mono text-xs tracking-widest transition-colors ${
              tab === t
                ? 'text-accent border-b border-accent -mb-px'
                : 'text-muted hover:text-text-primary'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'STATS' && (
        <div>
          {loading ? (
            <div className="font-mono text-sm text-muted">LOADING...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                {label: 'TOTAL USERS', value: stats.totalUsers},
                {label: 'TOTAL CONTESTS', value: stats.totalContests},
                {label: 'TOTAL SUBMISSIONS', value: stats.totalSubmissions},
                {
                  label: 'PENDING APPROVALS',
                  value: stats.pendingApprovals,
                  alert: stats.pendingApprovals > 0,
                },
                {label: 'REGISTRATIONS (7D)', value: stats.recentRegistrations},
                {
                  label: 'TOTAL REVENUE',
                  value: `₹${stats.totalRevenue}`,
                  highlight: true,
                },
              ].map(({label, value, highlight, alert}) => (
                <div
                  key={label}
                  className={`card p-5 ${alert ? 'border-warning/50' : ''}`}>
                  <div className="font-mono text-xs text-muted mb-2">
                    {label}
                  </div>
                  <div
                    className={`font-display text-3xl font-bold ${
                      highlight
                        ? 'text-accent'
                        : alert
                          ? 'text-warning'
                          : 'text-text-primary'
                    }`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Contests */}
      {tab === 'CONTESTS' && (
        <div className="space-y-3">
          {loading ? (
            <div className="font-mono text-sm text-muted">LOADING...</div>
          ) : (
            contests.map(c => (
              <div key={c._id} className="card p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ContestStatusBadge status={c.status} />
                    <div>
                      <div className="font-body text-sm text-text-primary font-medium">
                        {c.title}
                      </div>
                      <div className="font-mono text-xs text-muted">
                        by {c.organizerId?.name} · {c.registeredCount}{' '}
                        registered · ₹{c.prizePool}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!c.isApprovedByAdmin && c.status === 'draft' && (
                      <button
                        disabled={actionLoading === `approve-${c._id}`}
                        onClick={() =>
                          handleAction(`approve-${c._id}`, () =>
                            approveContest(c._id)
                          )
                        }
                        className="btn-primary text-xs px-3 py-1.5">
                        APPROVE
                      </button>
                    )}
                    {!c.isApprovedByAdmin && c.status === 'draft' && (
                      <button
                        disabled={actionLoading === `reject-${c._id}`}
                        onClick={() =>
                          handleAction(`reject-${c._id}`, () =>
                            rejectContest(c._id)
                          )
                        }
                        className="btn-ghost text-xs px-3 py-1.5">
                        REJECT
                      </button>
                    )}
                    {['live', 'judging'].includes(c.status) && (
                      <button
                        disabled={actionLoading === `close-${c._id}`}
                        onClick={() =>
                          handleAction(`close-${c._id}`, () =>
                            triggerClose(c._id)
                          )
                        }
                        className="btn-ghost text-xs px-3 py-1.5 border-error/40 text-error hover:border-error">
                        FORCE CLOSE
                      </button>
                    )}
                    {c.status === 'closed' && (
                      <button
                        disabled={actionLoading === `payout-${c._id}`}
                        onClick={() =>
                          handleAction(`payout-${c._id}`, () =>
                            processPayouts(c._id)
                          )
                        }
                        className="btn-primary text-xs px-3 py-1.5">
                        PROCESS PAYOUTS
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'USERS' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['NAME', 'EMAIL', 'ROLE', 'VERIFIED', 'JOINED', 'ACTION'].map(
                  h => (
                    <th
                      key={h}
                      className="font-mono text-xs text-muted text-left px-4 py-3">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center font-mono text-sm text-muted">
                    LOADING...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr
                    key={u._id}
                    className="border-b border-border/50 hover:bg-base transition-colors">
                    <td className="px-4 py-3 font-body text-sm text-text-primary">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono text-xs px-2 py-0.5 border ${
                          u.role === 'admin'
                            ? 'text-error border-error/30 bg-error/10'
                            : u.role === 'organizer'
                              ? 'text-accent border-accent/30 bg-accent-dim'
                              : 'text-muted border-border'
                        }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span
                        className={
                          u.isEmailVerified ? 'text-success' : 'text-error'
                        }>
                        {u.isEmailVerified ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u._id, e.target.value)}
                        className="bg-surface border border-border text-text-secondary font-mono text-xs px-2 py-1 focus:outline-none focus:border-accent">
                        <option value="contestant">CONTESTANT</option>
                        <option value="organizer">ORGANIZER</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
