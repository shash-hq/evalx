// client/src/pages/Home.jsx
import {Link} from 'react-router-dom';
import {useEffect, useState} from 'react';
import {getContests} from '../services/contestService.js';
import ContestCard from '../components/contest/ContestCard.jsx';

export default function Home() {
  const [liveContests, setLiveContests] = useState([]);

  useEffect(() => {
    getContests({status: 'live', limit: 3})
      .then(({data}) => setLiveContests(data.data.contests || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Hero */}
      <div className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#f0a50008_0%,_transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 py-24 relative">
          <div className="font-mono text-xs text-accent tracking-widest mb-4">
            // COMPETITIVE PROGRAMMING PLATFORM
          </div>
          <h1 className="font-display text-7xl md:text-9xl font-black tracking-widest uppercase text-text-primary leading-none mb-6">
            EVAL<span className="text-accent">X</span>
          </h1>
          <p className="font-body text-lg text-text-secondary max-w-xl mb-10 leading-relaxed">
            Enter paid contests. Write code. Climb the leaderboard. Win real
            prize pools.
          </p>
          <div className="flex gap-3">
            <Link to="/contests" className="btn-primary text-base px-8 py-3">
              ENTER CONTESTS →
            </Link>
            <Link to="/register" className="btn-ghost text-base px-8 py-3">
              CREATE ACCOUNT
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-8">
          {[
            {label: 'REAL-TIME JUDGING', val: 'PISTON ENGINE'},
            {label: 'PAYMENT GATEWAY', val: 'RAZORPAY'},
            {label: 'LIVE LEADERBOARDS', val: 'WEBSOCKETS'},
            {label: 'CODE EDITOR', val: 'MONACO'},
          ].map(({label, val}) => (
            <div key={label}>
              <div className="font-mono text-xs text-muted">{label}</div>
              <div className="font-mono text-sm text-accent font-bold">
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Contests */}
      {liveContests.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-mono text-xs text-success tracking-widest mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse inline-block" />
                LIVE NOW
              </div>
              <h2 className="font-display text-3xl font-bold tracking-widest uppercase text-text-primary">
                ACTIVE CONTESTS
              </h2>
            </div>
            <Link
              to="/contests"
              className="font-mono text-xs text-accent hover:underline">
              VIEW ALL →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {liveContests.map(c => (
              <ContestCard key={c._id} contest={c} />
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 py-16 border-t border-border">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'INSTANT JUDGING',
              body: 'Submissions run against hidden test cases in real-time via the Piston execution engine. Results delivered via WebSocket.',
            },
            {
              icon: '₹',
              title: 'REAL PRIZE POOLS',
              body: 'Entry fees collected via Razorpay. Prize pools distributed to winners automatically after contest closes.',
            },
            {
              icon: '◈',
              title: 'MONACO EDITOR',
              body: 'Full VS Code-grade editing experience. Syntax highlighting, autocomplete, and multi-language support built in.',
            },
          ].map(({icon, title, body}) => (
            <div key={title} className="card p-6">
              <div className="font-mono text-2xl mb-4 text-accent">{icon}</div>
              <h3 className="font-display text-xl font-bold tracking-wide uppercase mb-3 text-text-primary">
                {title}
              </h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
