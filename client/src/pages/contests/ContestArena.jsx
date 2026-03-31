import {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import {useAuth} from '../../hooks/useAuth.js';
import {useSocket} from '../../hooks/useSocket.js';
import {useContestTimer} from '../../hooks/useContestTimer.js';
import {
  getContestArena,
  getLeaderboard,
} from '../../services/contestService.js';
import {createSubmission} from '../../services/submissionService.js';
import {
  setSubmissionPending,
  setSubmissionResult,
} from '../../store/slices/submissionSlice.js';
import CodeEditor from '../../components/editor/CodeEditor.jsx';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable.jsx';
import ContestStatusBadge from '../../components/contest/ContestStatusBadge.jsx';

const LANGUAGES = ['python', 'cpp', 'java', 'javascript'];

const BOILERPLATE = {
  python: '# Write your solution here\n\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  return 0;\n}\n',
  java: 'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    // Write your solution here\n  }\n}\n',
  javascript:
    '// Write your solution here\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on("line", l => lines.push(l));\nrl.on("close", () => {\n  // process lines\n});\n',
};

export default function ContestArena() {
  const {contestId} = useParams();
  const {user, accessToken} = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = useSocket(accessToken);
  const {current: submissionStatus, pending} = useSelector(s => s.submissions);

  const [problems, setProblems] = useState([]);
  const [contest, setContest] = useState(null);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(BOILERPLATE.python);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('problem');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const {timeLeft, isExpired} = useContestTimer(contest?.endTime);

  useEffect(() => {
    Promise.all([getContestArena(contestId), getLeaderboard(contestId)])
      .then(([arenaRes, lRes]) => {
        const arena = arenaRes.data.data;
        const nextProblems = arena.problems || [];

        setContest(arena.contest);
        setProblems(nextProblems);
        setSelectedProblem(nextProblems[0] || null);
        setLeaderboard(lRes.data.data);
      })
      .catch(() => navigate('/contests'));
  }, [contestId, navigate]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleConnect = () => {
      socket.emit('join:contest', contestId);
    };

    const handleSubmissionResult = result => {
      dispatch(setSubmissionResult(result));
      const isAC = result.status === 'accepted';
      setToast({
        type: isAC ? 'success' : 'error',
        message: isAC
          ? 'ACCEPTED ✓'
          : result.status.replace(/_/g, ' ').toUpperCase(),
      });
      setTimeout(() => setToast(null), 4000);
    };

    const handleLeaderboardUpdate = data => {
      setLeaderboard(data);
    };

    const handleContestStatus = ({status}) => {
      setContest(prev => (prev ? {...prev, status} : prev));
    };

    const handleSocketError = ({message}) => {
      setToast({
        type: 'error',
        message: message || 'SOCKET ACCESS DENIED',
      });
      setTimeout(() => setToast(null), 4000);
    };

    const handleConnectError = () => {
      setToast({
        type: 'error',
        message: 'LIVE CONNECTION FAILED',
      });
      setTimeout(() => setToast(null), 4000);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('submission:result', handleSubmissionResult);
    socket.on('leaderboard:update', handleLeaderboardUpdate);
    socket.on('contest:status', handleContestStatus);
    socket.on('socket:error', handleSocketError);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.emit('leave:contest', contestId);
      socket.off('connect', handleConnect);
      socket.off('submission:result', handleSubmissionResult);
      socket.off('leaderboard:update', handleLeaderboardUpdate);
      socket.off('contest:status', handleContestStatus);
      socket.off('socket:error', handleSocketError);
      socket.off('connect_error', handleConnectError);
    };
  }, [contestId, dispatch, socket, user]);

  const handleLanguageChange = lang => {
    setLanguage(lang);
    setCode(BOILERPLATE[lang]);
  };

  const handleSubmit = async () => {
    if (!selectedProblem || submitting || isExpired) return;
    setSubmitting(true);
    try {
      const {data} = await createSubmission({
        problemId: selectedProblem._id,
        contestId,
        code,
        language,
      });
      dispatch(setSubmissionPending(data.data.submissionId));
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'SUBMISSION FAILED',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const diffColor = {
    easy: 'text-success',
    medium: 'text-warning',
    hard: 'text-error',
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-base scanline">
      {/* Arena Header */}
      <div className="h-10 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
        <span className="font-display text-sm font-bold tracking-widest text-accent uppercase">
          EVALX
        </span>
        <span className="text-border">|</span>
        {contest && <ContestStatusBadge status={contest.status} />}
        <span className="text-border">|</span>
        <span
          className={`font-mono text-sm font-bold ${isExpired ? 'text-error' : 'text-text-primary'}`}>
          {timeLeft}
        </span>
        {isExpired && (
          <span className="font-mono text-xs text-error animate-pulse">
            CONTEST ENDED
          </span>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 font-mono text-sm border transition-all ${
            toast.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-error/10 border-error/30 text-error'
          }`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Problem List Sidebar */}
        <div className="w-48 bg-surface border-r border-border flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border">
            <span className="font-mono text-xs text-muted tracking-widest">
              PROBLEMS
            </span>
          </div>
          {problems.map((p, i) => (
            <button
              key={p._id}
              onClick={() => setSelectedProblem(p)}
              className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors ${
                selectedProblem?._id === p._id
                  ? 'bg-accent-dim border-l-2 border-l-accent'
                  : 'hover:bg-base'
              }`}>
              <div className="font-mono text-xs text-text-secondary mb-1">
                {String.fromCharCode(65 + i)}. {p.points}pts
              </div>
              <div className="font-body text-xs text-text-primary line-clamp-2">
                {p.title}
              </div>
              <div
                className={`font-mono text-xs mt-1 ${diffColor[p.difficulty]}`}>
                {p.difficulty.toUpperCase()}
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Problem / Leaderboard Panel */}
          <div className="w-[45%] flex flex-col border-r border-border">
            <div className="flex border-b border-border flex-shrink-0">
              {['problem', 'leaderboard'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 font-mono text-xs tracking-widest transition-colors ${
                    activeTab === tab
                      ? 'text-accent border-b border-accent bg-accent-dim'
                      : 'text-muted hover:text-text-primary'
                  }`}>
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'problem' && selectedProblem && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-wide uppercase text-text-primary mb-1">
                      {selectedProblem.title}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-xs ${diffColor[selectedProblem.difficulty]}`}>
                        {selectedProblem.difficulty?.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {selectedProblem.points} POINTS
                      </span>
                    </div>
                  </div>

                  <div className="prose-sm">
                    <p className="font-body text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedProblem.statement}
                    </p>
                  </div>

                  {selectedProblem.inputFormat && (
                    <div>
                      <h4 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">
                        INPUT FORMAT
                      </h4>
                      <p className="font-body text-sm text-text-secondary">
                        {selectedProblem.inputFormat}
                      </p>
                    </div>
                  )}

                  {selectedProblem.outputFormat && (
                    <div>
                      <h4 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">
                        OUTPUT FORMAT
                      </h4>
                      <p className="font-body text-sm text-text-secondary">
                        {selectedProblem.outputFormat}
                      </p>
                    </div>
                  )}

                  {selectedProblem.constraints && (
                    <div>
                      <h4 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">
                        CONSTRAINTS
                      </h4>
                      <pre className="font-mono text-xs text-text-secondary bg-surface border border-border p-3">
                        {selectedProblem.constraints}
                      </pre>
                    </div>
                  )}

                  {selectedProblem.sampleCases?.map((sc, i) => (
                    <div key={i}>
                      <h4 className="font-mono text-xs text-muted uppercase tracking-wider mb-2">
                        SAMPLE {i + 1}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="font-mono text-xs text-muted mb-1">
                            INPUT
                          </div>
                          <pre className="font-mono text-xs bg-surface border border-border p-3 text-text-primary">
                            {sc.input}
                          </pre>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-muted mb-1">
                            OUTPUT
                          </div>
                          <pre className="font-mono text-xs bg-surface border border-border p-3 text-text-primary">
                            {sc.output}
                          </pre>
                        </div>
                      </div>
                      {sc.explanation && (
                        <p className="font-body text-xs text-text-secondary mt-2">
                          {sc.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardTable data={leaderboard} />
              )}
            </div>
          </div>

          {/* Editor Panel */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface flex-shrink-0">
              <div className="flex gap-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-3 py-1 font-mono text-xs transition-colors ${
                      language === lang
                        ? 'bg-accent text-base'
                        : 'text-muted hover:text-text-primary'
                    }`}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {pending && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                    <span className="font-mono text-xs text-warning">
                      JUDGING...
                    </span>
                  </div>
                )}
                {submissionStatus && !pending && (
                  <span
                    className={`font-mono text-xs ${
                      submissionStatus.status === 'accepted'
                        ? 'text-success'
                        : 'text-error'
                    }`}>
                    {submissionStatus.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || pending || isExpired}
                  className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
                  {submitting
                    ? 'QUEUING...'
                    : pending
                      ? 'JUDGING...'
                      : 'SUBMIT'}
                </button>
              </div>
            </div>

            <div className="flex-1">
              <CodeEditor value={code} onChange={setCode} language={language} />
            </div>

            {/* Test Results */}
            {submissionStatus?.testResults?.length > 0 && (
              <div className="h-32 overflow-y-auto border-t border-border bg-surface p-3">
                <div className="font-mono text-xs text-muted mb-2 tracking-wider">
                  TEST RESULTS
                </div>
                <div className="flex flex-wrap gap-2">
                  {submissionStatus.testResults.map((tr, i) => (
                    <div
                      key={i}
                      className={`font-mono text-xs px-2 py-1 border ${
                        tr.passed
                          ? 'text-success border-success/30 bg-success/10'
                          : 'text-error border-error/30 bg-error/10'
                      }`}>
                      TC{i + 1} {tr.passed ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
