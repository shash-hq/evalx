import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {fetchContests} from '../../store/slices/contestSlice.js';
import ContestCard from '../../components/contest/ContestCard.jsx';

const STATUSES = ['all', 'upcoming', 'live', 'closed'];

export default function ContestList() {
  const dispatch = useDispatch();
  const {list, loading, pagination} = useSelector(s => s.contests);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = {page, limit: 12};
    if (status !== 'all') params.status = status;
    if (search) params.search = search;
    dispatch(fetchContests(params));
  }, [status, page, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="font-mono text-xs text-muted mb-1 tracking-widest">
          // BROWSE
        </div>
        <h1 className="font-display text-5xl font-bold tracking-widest uppercase text-text-primary">
          CONTESTS
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="SEARCH CONTESTS..."
          className="input-field flex-1 font-mono text-xs"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`px-4 py-2.5 font-mono text-xs transition-colors ${
                status === s
                  ? 'bg-accent text-base'
                  : 'border border-border text-text-secondary hover:border-accent hover:text-accent'
              }`}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="card p-5 h-52 animate-pulse">
                <div className="h-4 bg-border w-1/3 mb-3" />
                <div className="h-6 bg-border w-3/4 mb-2" />
                <div className="h-4 bg-border w-full" />
              </div>
            ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-24 font-mono text-muted text-sm">
          NO CONTESTS FOUND
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(c => (
              <ContestCard key={c._id} contest={c} />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({length: pagination.pages}, (_, i) => i + 1).map(
                p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 font-mono text-xs transition-colors ${
                      page === p
                        ? 'bg-accent text-base'
                        : 'border border-border text-text-secondary hover:border-accent'
                    }`}>
                    {p}
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
