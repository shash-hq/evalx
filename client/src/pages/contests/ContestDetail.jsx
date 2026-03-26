import {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth.js';
import {getContestBySlug} from '../../services/contestService.js';
import {createOrder, verifyPayment} from '../../services/paymentService.js';
import ContestStatusBadge from '../../components/contest/ContestStatusBadge.jsx';
import ContestTimer from '../../components/contest/ContestTimer.jsx';

export default function ContestDetail() {
  const {slug} = useParams();
  const {user, isAuthenticated} = useAuth();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    getContestBySlug(slug)
      .then(({data}) => {
        setContest(data.data);
        if (user && data.data.participants?.includes(user._id))
          setRegistered(true);
      })
      .catch(() => navigate('/contests'))
      .finally(() => setLoading(false));
  }, [slug, user]);

  const handleRegister = async () => {
    if (!isAuthenticated) return navigate('/login');
    setPaying(true);
    setError('');

    try {
      const {data} = await createOrder(contest._id);

      if (data.data.free) {
        setRegistered(true);
        return;
      }

      const {orderId, amount, currency, key} = data.data;

      const options = {
        key,
        amount,
        currency,
        name: 'EvalX',
        description: contest.title,
        order_id: orderId,
        handler: async response => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              contestId: contest._id,
            });
            setRegistered(true);
          } catch (err) {
            setError('Payment verification failed. Contact support.');
          }
        },
        prefill: {name: user?.name, email: user?.email},
        theme: {color: '#f0a500'},
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () =>
        setError('Payment failed. Please try again.')
      );
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-muted text-sm">
        LOADING...
      </div>
    );
  }

  if (!contest) return null;

  const canEnter = registered && ['live'].includes(contest.status);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <ContestStatusBadge status={contest.status} />
            <ContestTimer
              startTime={contest.startTime}
              endTime={contest.endTime}
            />
          </div>
          <h1 className="font-display text-5xl font-bold tracking-widest uppercase text-text-primary mb-2">
            {contest.title}
          </h1>
          <p className="text-text-secondary font-body">
            by <span className="text-accent">{contest.organizerId?.name}</span>
          </p>
        </div>

        <div className="card p-5 min-w-[220px]">
          <div className="space-y-3 mb-5">
            {[
              {
                label: 'ENTRY FEE',
                value: contest.entryFee === 0 ? 'FREE' : `₹${contest.entryFee}`,
              },
              {
                label: 'PRIZE POOL',
                value: `₹${contest.prizePool}`,
                highlight: true,
              },
              {
                label: 'PARTICIPANTS',
                value: `${contest.registeredCount} / ${contest.maxParticipants}`,
              },
              {label: 'PROBLEMS', value: contest.problems?.length || 0},
            ].map(({label, value, highlight}) => (
              <div key={label} className="flex justify-between items-center">
                <span className="font-mono text-xs text-muted">{label}</span>
                <span
                  className={`font-mono text-sm font-bold ${highlight ? 'text-accent' : 'text-text-primary'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="font-mono text-xs text-error mb-3 border border-error/30 bg-error/10 px-3 py-2">
              {error}
            </div>
          )}

          {canEnter ? (
            <button
              onClick={() => navigate(`/arena/${contest._id}`)}
              className="btn-primary w-full">
              ENTER ARENA →
            </button>
          ) : registered ? (
            <div className="text-center font-mono text-xs text-success border border-success/30 bg-success/10 py-2.5">
              ✓ REGISTERED
            </div>
          ) : ['upcoming', 'live'].includes(contest.status) ? (
            <button
              onClick={handleRegister}
              disabled={paying}
              className="btn-primary w-full">
              {paying
                ? 'PROCESSING...'
                : contest.entryFee === 0
                  ? 'REGISTER FREE'
                  : `PAY ₹${contest.entryFee}`}
            </button>
          ) : (
            <div className="text-center font-mono text-xs text-muted">
              REGISTRATION CLOSED
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold tracking-wide uppercase mb-4 text-text-primary">
              ABOUT
            </h2>
            <p className="font-body text-text-secondary text-sm leading-relaxed">
              {contest.description || 'No description provided.'}
            </p>
          </div>

          {contest.prizeDistribution?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold tracking-wide uppercase mb-4 text-text-primary">
                PRIZES
              </h2>
              <div className="space-y-2">
                {contest.prizeDistribution.map(p => (
                  <div
                    key={p.rank}
                    className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="font-mono text-sm text-text-secondary">
                      RANK #{p.rank}
                    </span>
                    <span className="font-mono text-sm text-accent font-bold">
                      ₹{(p.percentage / 100) * contest.prizePool}
                      <span className="text-muted font-normal ml-1">
                        ({p.percentage}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-3">
              SCHEDULE
            </h3>
            <div className="space-y-3">
              <div>
                <div className="font-mono text-xs text-muted mb-1">START</div>
                <div className="font-mono text-sm text-text-primary">
                  {new Date(contest.startTime).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs text-muted mb-1">END</div>
                <div className="font-mono text-sm text-text-primary">
                  {new Date(contest.endTime).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {contest.tags?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-3">
                TAGS
              </h3>
              <div className="flex flex-wrap gap-2">
                {contest.tags.map(tag => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2 py-1 bg-base border border-border text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
