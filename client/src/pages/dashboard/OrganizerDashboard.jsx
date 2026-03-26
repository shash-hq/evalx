import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth.js';
import {getAdminContests} from '../../services/adminService.js';
import api from '../../services/api.js';
import ContestStatusBadge from '../../components/contest/ContestStatusBadge.jsx';

export default function OrganizerDashboard() {
  const {user} = useAuth();
  const [contests, setContests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    entryFee: 0,
    prizePool: 0,
    maxParticipants: 500,
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchContests = async () => {
    try {
      const {data} = await api.get('/contests', {params: {limit: 50}});
      setContests(
        data.data.contests.filter(
          c => c.organizerId?._id === user?._id || c.organizerId === user?._id
        )
      );
    } catch (_) {}
  };

  useEffect(() => {
    fetchContests();
  }, [user]);

  const handleCreate = async e => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        maxParticipants: Number(form.maxParticipants),
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      };
      await api.post('/contests', payload);
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        entryFee: 0,
        prizePool: 0,
        maxParticipants: 500,
        tags: '',
      });
      fetchContests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create contest');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-mono text-xs text-muted mb-1 tracking-widest">
            // ORGANIZER
          </div>
          <h1 className="font-display text-4xl font-bold tracking-widest uppercase">
            MY CONTESTS
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'CANCEL' : '+ NEW CONTEST'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="font-mono text-xs text-muted tracking-wider mb-5 uppercase">
            Create Contest
          </h2>
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
            {error && (
              <div className="md:col-span-2 border border-error/30 bg-error/10 px-4 py-3 font-mono text-sm text-error">
                {error}
              </div>
            )}
            {[
              {key: 'title', label: 'TITLE', type: 'text', span: 2},
              {key: 'description', label: 'DESCRIPTION', type: 'text', span: 2},
              {key: 'startTime', label: 'START TIME', type: 'datetime-local'},
              {key: 'endTime', label: 'END TIME', type: 'datetime-local'},
              {key: 'entryFee', label: 'ENTRY FEE (₹)', type: 'number'},
              {key: 'prizePool', label: 'PRIZE POOL (₹)', type: 'number'},
              {
                key: 'maxParticipants',
                label: 'MAX PARTICIPANTS',
                type: 'number',
              },
              {key: 'tags', label: 'TAGS (comma separated)', type: 'text'},
            ].map(({key, label, type, span}) => (
              <div key={key} className={span === 2 ? 'md:col-span-2' : ''}>
                <label className="font-mono text-xs text-muted block mb-1.5 tracking-wider">
                  {label}
                </label>
                <input
                  type={type}
                  className="input-field"
                  value={form[key]}
                  onChange={e => setForm({...form, [key]: e.target.value})}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary">
                {submitting ? 'CREATING...' : 'CREATE CONTEST'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {contests.length === 0 ? (
          <div className="card p-12 text-center font-mono text-sm text-muted">
            NO CONTESTS YET. CREATE ONE ABOVE.
          </div>
        ) : (
          contests.map(c => (
            <div
              key={c._id}
              className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ContestStatusBadge status={c.status} />
                <div>
                  <div className="font-body text-sm text-text-primary font-medium">
                    {c.title}
                  </div>
                  <div className="font-mono text-xs text-muted">
                    {new Date(c.startTime).toLocaleDateString()} ·{' '}
                    {c.registeredCount} registered · ₹{c.prizePool} pool
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!c.isApprovedByAdmin && (
                  <span className="font-mono text-xs text-warning border border-warning/30 px-2 py-0.5">
                    PENDING APPROVAL
                  </span>
                )}
                <Link
                  to={`/contests/${c.slug}`}
                  className="btn-ghost text-xs px-3 py-1.5">
                  VIEW
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
