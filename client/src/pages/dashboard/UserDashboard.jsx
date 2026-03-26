import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth.js';
import api from '../../services/api.js';
import {getPaymentHistory} from '../../services/paymentService.js';

export default function UserDashboard() {
  const {user} = useAuth();
  const [contests, setContests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/contests', {params: {limit: 5}}),
      getPaymentHistory(),
    ])
      .then(([cRes, tRes]) => {
        setContests(cRes.data.data.contests || []);
        setTransactions(tRes.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {label: 'RATING', value: user?.rating || 1200, highlight: true},
    {label: 'CONTESTS', value: user?.contestsEntered?.length || 0},
    {label: 'ROLE', value: user?.role?.toUpperCase()},
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="font-mono text-xs text-muted mb-1 tracking-widest">
          // OVERVIEW
        </div>
        <h1 className="font-display text-4xl font-bold tracking-widest uppercase text-text-primary">
          {user?.name}
        </h1>
        <p className="font-mono text-sm text-text-secondary mt-1">
          {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map(({label, value, highlight}) => (
          <div key={label} className="card p-5">
            <div className="font-mono text-xs text-muted mb-1">{label}</div>
            <div
              className={`font-display text-3xl font-bold tracking-wide ${highlight ? 'text-accent' : 'text-text-primary'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h2 className="font-mono text-xs text-muted tracking-wider uppercase">
              RECENT CONTESTS
            </h2>
            <Link
              to="/contests"
              className="font-mono text-xs text-accent hover:underline">
              VIEW ALL →
            </Link>
          </div>
          {contests.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-muted">
              NO CONTESTS YET
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contests.slice(0, 5).map(c => (
                <Link
                  key={c._id}
                  to={`/contests/${c.slug}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-base transition-colors">
                  <span className="font-body text-sm text-text-primary">
                    {c.title}
                  </span>
                  <span className="font-mono text-xs text-accent">
                    ₹{c.prizePool}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-mono text-xs text-muted tracking-wider uppercase">
              PAYMENT HISTORY
            </h2>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-muted">
              NO TRANSACTIONS YET
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.slice(0, 5).map(t => (
                <div
                  key={t._id}
                  className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-body text-sm text-text-primary">
                      {t.contestId?.title}
                    </div>
                    <div className="font-mono text-xs text-muted capitalize">
                      {t.type.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm font-bold ${t.type === 'prize_payout' ? 'text-success' : 'text-text-primary'}`}>
                      {t.type === 'prize_payout' ? '+' : '-'}₹{t.amount}
                    </div>
                    <div
                      className={`font-mono text-xs ${t.status === 'captured' ? 'text-success' : 'text-error'}`}>
                      {t.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
