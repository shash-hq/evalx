import {useState, useRef, useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {verifyOTP, resendOTP} from '../../services/authService.js';
import {setCredentials} from '../../store/slices/authSlice.js';

export default function VerifyOTP() {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = e => {
    const paste = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    const next = [...digits];
    paste.split('').forEach((d, i) => {
      next[i] = d;
    });
    setDigits(next);
    inputs.current[Math.min(paste.length, 5)]?.focus();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) return setError('Enter all 6 digits');
    setError('');
    setLoading(true);
    try {
      const {data} = await verifyOTP({email, otp});
      dispatch(setCredentials(data.data));
      navigate('/contests');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      setDigits(Array(6).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOTP({email});
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="font-mono text-xs text-muted mb-2 tracking-widest">
            // VERIFY IDENTITY
          </div>
          <h1 className="font-display text-4xl font-bold tracking-widest uppercase text-text-primary">
            ENTER OTP
          </h1>
          <p className="font-body text-sm text-text-secondary mt-2">
            Sent to <span className="text-accent">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="border border-error/30 bg-error/10 px-4 py-3 font-mono text-sm text-error mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3 mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center font-mono text-xl font-bold bg-surface border border-border focus:border-accent focus:outline-none text-text-primary transition-colors"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mb-4">
            {loading ? 'VERIFYING...' : 'VERIFY'}
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="w-full font-mono text-xs text-muted hover:text-accent transition-colors disabled:opacity-40">
          {resendCooldown > 0 ? `RESEND IN ${resendCooldown}s` : 'RESEND OTP'}
        </button>
      </div>
    </div>
  );
}
