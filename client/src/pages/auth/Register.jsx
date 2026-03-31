import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {register} from '../../services/authService.js';

export default function Register() {
  const [form, setForm] = useState({name: '', email: '', password: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const {data} = await register(form);
      navigate('/verify-otp', {state: {email: data.data.email}});
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="font-mono text-xs text-muted mb-2 tracking-widest">
            // NEW ACCOUNT
          </div>
          <h1 className="font-display text-4xl font-bold tracking-widest uppercase text-text-primary">
            REGISTER
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="border border-error/30 bg-error/10 px-4 py-3 font-mono text-sm text-error">
              {error}
            </div>
          )}

          {[
            {
              key: 'name',
              label: 'FULL NAME',
              type: 'text',
              placeholder: 'John Doe',
            },
            {
              key: 'email',
              label: 'EMAIL',
              type: 'email',
              placeholder: 'you@example.com',
            },
            {
              key: 'password',
              label: 'PASSWORD',
              type: 'password',
              placeholder: '••••••••',
            },
          ].map(({key, label, type, placeholder}) => (
            <div key={key}>
              <label className="font-mono text-xs text-muted block mb-1.5 tracking-wider">
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                className="input-field"
                value={form[key]}
                onChange={e => setForm({...form, [key]: e.target.value})}
                required
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2">
            {loading ? 'SENDING OTP...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-xs text-muted">
          HAVE AN ACCOUNT?{' '}
          <Link to="/login" className="text-accent hover:underline">
            SIGN IN
          </Link>
        </p>
      </div>
    </div>
  );
}
