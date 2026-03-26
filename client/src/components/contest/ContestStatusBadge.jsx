const CONFIG = {
  draft: {label: 'DRAFT', cls: 'bg-muted/20 text-muted border-muted/30'},
  upcoming: {label: 'UPCOMING', cls: 'bg-info/10 text-info border-info/30'},
  live: {
    label: 'LIVE',
    cls: 'bg-success/10 text-success border-success/30 animate-pulse',
  },
  judging: {
    label: 'JUDGING',
    cls: 'bg-warning/10 text-warning border-warning/30',
  },
  closed: {label: 'CLOSED', cls: 'bg-error/10 text-error border-error/30'},
};

export default function ContestStatusBadge({status}) {
  const {label, cls} = CONFIG[status] || CONFIG.draft;
  return <span className={`status-badge border ${cls}`}>{label}</span>;
}
