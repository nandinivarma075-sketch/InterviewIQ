import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

function validate(form) {
  const errors = {};
  if (!form.name.trim() || form.name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.';
  if (!form.email.trim())
    errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email address.';
  if (!form.password)
    errors.password = 'Password is required.';
  else if (form.password.length < 8)
    errors.password = 'Password must be at least 8 characters.';
  return errors;
}

function passwordStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)  s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'var(--error-500)', 'var(--warning-500)', 'var(--info-500)', 'var(--success-500)'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [form,         setForm]         = useState({ name: '', email: '', password: '' });
  const [errors,       setErrors]       = useState({});
  const [touched,      setTouched]      = useState({});
  const [submitError,  setSubmitError]  = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (touched[name]) {
      const ne = validate({ ...form, [name]: value });
      setErrors((p) => ({ ...p, [name]: ne[name] }));
    }
    setSubmitError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
    const ne = validate(form);
    setErrors((p) => ({ ...p, [name]: ne[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    const ne = validate(form);
    setErrors(ne);
    if (Object.keys(ne).length > 0) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, false);
      navigate('/login', {
        state: {
          registeredEmail: form.email.trim(),
          message: 'Account created successfully! Please sign in with your credentials.',
        },
      });
    } catch (err) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldState = (name) => {
    if (!touched[name]) return '';
    return errors[name] ? 'form-group--error' : 'form-group--success';
  };

  const strength = passwordStrength(form.password);

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-page__glow" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-card__logo">
          <div className="auth-card__logo-icon"><Zap size={20} fill="white" color="white" /></div>
          <span className="auth-card__logo-name">InterviewIQ</span>
        </div>
        <div className="auth-card__header">
          <h1 className="auth-card__title">Create your account</h1>
          <p className="auth-card__subtitle">Start your AI-powered interview journey today</p>
        </div>

        {submitError && (
          <div className="form-alert form-alert--error" role="alert">
            <AlertCircle size={15} /> {submitError}
          </div>
        )}

        <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className={`form-group ${fieldState('name')}`}>
            <label htmlFor="register-name" className="form-label">Full name <span>*</span></label>
            <div className="input-wrapper">
              <User className="input-icon-left" size={16} />
              <input id="register-name" name="name" type="text"
                className="form-input input-with-left-icon input-with-right-icon"
                placeholder="Alex Johnson" value={form.name}
                onChange={handleChange} onBlur={handleBlur}
                aria-describedby={errors.name ? 'register-name-error' : undefined}
                aria-invalid={!!errors.name} autoComplete="name" />
              {touched.name && !errors.name && <span className="input-icon-right input-status-icon"><CheckCircle2 size={15} color="var(--success-500)" /></span>}
              {touched.name && errors.name  && <span className="input-icon-right input-status-icon"><AlertCircle size={15} color="var(--error-500)" /></span>}
            </div>
            {touched.name && errors.name && <p className="form-error" id="register-name-error" role="alert"><AlertCircle size={12} /> {errors.name}</p>}
          </div>

          {/* Email */}
          <div className={`form-group ${fieldState('email')}`}>
            <label htmlFor="register-email" className="form-label">Email address <span>*</span></label>
            <div className="input-wrapper">
              <Mail className="input-icon-left" size={16} />
              <input id="register-email" name="email" type="email"
                className="form-input input-with-left-icon input-with-right-icon"
                placeholder="you@example.com" value={form.email}
                onChange={handleChange} onBlur={handleBlur}
                aria-describedby={errors.email ? 'register-email-error' : undefined}
                aria-invalid={!!errors.email} autoComplete="email" />
              {touched.email && !errors.email && <span className="input-icon-right input-status-icon"><CheckCircle2 size={15} color="var(--success-500)" /></span>}
              {touched.email && errors.email  && <span className="input-icon-right input-status-icon"><AlertCircle size={15} color="var(--error-500)" /></span>}
            </div>
            {touched.email && errors.email && <p className="form-error" id="register-email-error" role="alert"><AlertCircle size={12} /> {errors.email}</p>}
          </div>

          {/* Password */}
          <div className={`form-group ${fieldState('password')}`}>
            <label htmlFor="register-password" className="form-label">Password <span>*</span></label>
            <div className="input-wrapper">
              <Lock className="input-icon-left" size={16} />
              <input id="register-password" name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input input-with-left-icon input-with-right-icon"
                placeholder="At least 8 characters" value={form.password}
                onChange={handleChange} onBlur={handleBlur}
                aria-describedby="register-password-hint"
                aria-invalid={!!errors.password} autoComplete="new-password" />
              <button type="button" className="input-icon-right" id="register-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="password-strength" id="register-password-hint" aria-live="polite">
                <div className="password-strength__bar">
                  {[1,2,3,4].map((n) => (
                    <span key={n} className="password-strength__segment"
                      style={{ background: n <= strength ? STRENGTH_COLORS[strength] : undefined }} />
                  ))}
                </div>
                <span className="password-strength__label" style={{ color: STRENGTH_COLORS[strength] }}>
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
            {touched.password && errors.password
              ? <p className="form-error" role="alert"><AlertCircle size={12} /> {errors.password}</p>
              : <p className="form-hint">Must be at least 8 characters</p>
            }
          </div>

          <button type="submit" id="register-submit-btn"
            className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
            disabled={loading}>
            {loading ? <><span className="auth-spinner" aria-hidden="true" /> Creating account…</> : <>Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="divider-text">or</div>
        <p className="auth-card__switch">
          Already have an account? <Link to="/login" id="register-go-login">Log in</Link>
        </p>
        <p className="auth-card__terms">
          By creating an account, you agree to our <Link to="#">Terms of Service</Link> and <Link to="#">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
