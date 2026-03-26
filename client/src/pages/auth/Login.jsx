import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {login} from '../../services/authService.js';
import {setCredentials} from '../../store/slices/authSlice.js';

export default function Login() {
  const [form, setForm] = useState({email: '', password: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const {data} = await login(form);
      dispatch(setCredentials(data.data));
      navigate('/contests');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="font-mono text-xs text-muted mb-2 tracking-widest">
            // AUTHENTICATE
          </div>
          <h1 className="font-display text-4xl font-bold tracking-widest uppercase text-text-primary">
            SIGN IN
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
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-xs text-muted">
          NO ACCOUNT?{' '}
          <Link to="/register" className="text-accent hover:underline">
            REGISTER
          </Link>
        </p>
      </div>
    </div>
  );
}
