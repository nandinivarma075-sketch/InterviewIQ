import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

function validate(form) {
  const errors = {};
  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  return errors;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = location.state?.message;

  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [form,         setForm]         = useState({
    email: location.state?.registeredEmail || '',
    password: '',
  });
  const [errors,       setErrors]       = useState({});
  const [touched,      setTouched]      = useState({});
  const [submitError,  setSubmitError]  = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const newErrors = validate({ ...form, [name]: value });
      setErrors((prev) => ({ ...prev, [name]: newErrors[name] }));
    }
    setSubmitError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newErrors = validate(form);
    setErrors((prev) => ({ ...prev, [name]: newErrors[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const newErrors = validate(form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      navigate('/dashboard');
    } catch (err) {
      setSubmitError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldState = (name) => {
    if (!touched[name]) return '';
    return errors[name] ? 'form-group--error' : 'form-group--success';
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-page__glow" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon">
            <Zap size={20} fill="white" color="white" />
          </div>
          <span className="auth-card__logo-name">InterviewIQ</span>
        </div>

        <div className="auth-card__header">
          <h1 className="auth-card__title">Welcome back</h1>
          <p className="auth-card__subtitle">Log in to continue your interview preparation</p>
        </div>

        {successMessage && (
          <div className="form-alert form-alert--success" role="status" id="login-success-banner">
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        {submitError && (
          <div className="form-alert form-alert--error" role="alert" id="login-submit-error">
            <AlertCircle size={15} /> {submitError}
          </div>
        )}

        <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
          <div className={`form-group ${fieldState('email')}`}>
            <label htmlFor="login-email" className="form-label">Email address <span>*</span></label>
            <div className="input-wrapper">
              <Mail className="input-icon-left" size={16} />
              <input
                id="login-email" name="email" type="email"
                className="form-input input-with-left-icon input-with-right-icon"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange} onBlur={handleBlur}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                aria-invalid={!!errors.email} autoComplete="email"
              />
              {touched.email && !errors.email && (
                <span className="input-icon-right input-status-icon" aria-hidden="true">
                  <CheckCircle2 size={15} color="var(--success-500)" />
                </span>
              )}
              {touched.email && errors.email && (
                <span className="input-icon-right input-status-icon" aria-hidden="true">
                  <AlertCircle size={15} color="var(--error-500)" />
                </span>
              )}
            </div>
            {touched.email && errors.email && (
              <p className="form-error" id="login-email-error" role="alert">
                <AlertCircle size={12} /> {errors.email}
              </p>
            )}
          </div>

          <div className={`form-group ${fieldState('password')}`}>
            <label htmlFor="login-password" className="form-label">Password <span>*</span></label>
            <div className="input-wrapper">
              <Lock className="input-icon-left" size={16} />
              <input
                id="login-password" name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input input-with-left-icon input-with-right-icon"
                placeholder="Enter your password"
                value={form.password} onChange={handleChange} onBlur={handleBlur}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                aria-invalid={!!errors.password} autoComplete="current-password"
              />
              <button
                type="button" className="input-icon-right"
                id="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="form-error" id="login-password-error" role="alert">
                <AlertCircle size={12} /> {errors.password}
              </p>
            )}
            <div className="auth-card__forgot">
              <Link to="#" id="login-forgot-password">Forgot password?</Link>
            </div>
          </div>

          <button
            type="submit" id="login-submit-btn"
            className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="auth-spinner" aria-hidden="true" /> Logging in…</>
            ) : (
              <>Log In <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="divider-text">or</div>

        <p className="auth-card__switch">
          Don't have an account?{' '}
          <Link to="/register" id="login-go-register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
