import {Link} from 'react-router-dom';
import ContestStatusBadge from './ContestStatusBadge.jsx';
import ContestTimer from './ContestTimer.jsx';

export default function ContestCard({contest}) {
  return (
    <Link
      to={`/contests/${contest.slug}`}
      className="card block p-5 hover:border-accent/40 transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <ContestStatusBadge status={contest.status} />
        <ContestTimer startTime={contest.startTime} endTime={contest.endTime} />
      </div>

      <h3 className="font-display text-xl font-bold tracking-wide text-text-primary group-hover:text-accent transition-colors mb-2 uppercase">
        {contest.title}
      </h3>

      <p className="text-text-secondary text-sm font-body line-clamp-2 mb-4">
        {contest.description || 'No description provided.'}
      </p>

      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-mono text-xs text-muted">ENTRY FEE</div>
            <div className="font-mono text-sm text-text-primary">
              {contest.entryFee === 0 ? 'FREE' : `₹${contest.entryFee}`}
            </div>
          </div>
          <div>
            <div className="font-mono text-xs text-muted">PRIZE POOL</div>
            <div className="font-mono text-sm text-accent">
              ₹{contest.prizePool}
            </div>
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted">REGISTERED</div>
          <div className="font-mono text-sm text-text-primary">
            {contest.registeredCount}/{contest.maxParticipants}
          </div>
        </div>
      </div>

      {contest.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {contest.tags.map(tag => (
            <span
              key={tag}
              className="font-mono text-xs px-2 py-0.5 bg-base text-muted border border-border">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
