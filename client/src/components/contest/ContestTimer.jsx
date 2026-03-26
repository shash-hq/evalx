import {useContestTimer} from '../../hooks/useContestTimer.js';

export default function ContestTimer({endTime, startTime}) {
  const isStarted = new Date(startTime) <= new Date();
  const {timeLeft, isExpired} = useContestTimer(
    isStarted ? endTime : startTime
  );

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted uppercase">
        {isExpired ? 'ENDED' : isStarted ? 'ENDS IN' : 'STARTS IN'}
      </span>
      <span
        className={`font-mono text-sm font-medium ${isExpired ? 'text-error' : 'text-accent'}`}>
        {timeLeft}
      </span>
    </div>
  );
}
