import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Staff login form with email/password Firebase Auth.
 * Accessible with proper form labels, error display, and keyboard support.
 */
export default function LoginForm() {
  const { signIn, error: authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/staff');
    } catch (err) {
      setFormError('Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="login-section" aria-label="Staff login">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon" aria-hidden="true">🔐</span>
          <h2 className="login-title">Staff Login</h2>
          <p className="login-subtitle">
            Sign in to access the operations dashboard
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {(formError || authError) && (
            <div className="login-error" role="alert">
              <span aria-hidden="true">⚠️</span> {formError || authError}
            </div>
          )}

          <div className="login-form__field">
            <label htmlFor="login-email" className="login-form__label">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="login-form__input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="staff@venueflow.app"
              required
              aria-required="true"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="login-form__field">
            <label htmlFor="login-password" className="login-form__label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="login-form__input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              aria-required="true"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="login-form__submit"
            disabled={submitting || loading}
            aria-busy={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </section>
  );
}
