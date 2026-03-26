export default function LeaderboardTable({data}) {
  if (!data?.length) {
    return (
      <div className="text-center py-12 text-muted font-mono text-sm">
        NO SUBMISSIONS YET
      </div>
    );
  }

  const medalColors = ['text-accent', 'text-text-secondary', 'text-warning'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {['RANK', 'CONTESTANT', 'SOLVED', 'SCORE', 'LAST SUBMISSION'].map(
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
          {data.map(entry => (
            <tr
              key={entry.userId}
              className="border-b border-border/50 hover:bg-surface transition-colors">
              <td className="px-4 py-3">
                <span
                  className={`font-mono font-bold text-sm ${medalColors[entry.rank - 1] || 'text-text-primary'}`}>
                  #{entry.rank}
                </span>
              </td>
              <td className="px-4 py-3 font-body text-sm text-text-primary">
                {entry.name}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                {entry.solvedCount}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-accent font-bold">
                {entry.totalScore}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">
                {new Date(entry.lastSubmission).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
