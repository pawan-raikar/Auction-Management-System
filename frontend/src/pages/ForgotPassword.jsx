import React, { useState, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../api';
import { ToastContext } from '../context/ToastContext';

const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 13L3 22h10l7-7"/><path d="m14.5 2.5 7 7-4.5 4.5-7-7z"/>
  </svg>
);

/* 6-digit OTP input — no hooks-in-loop */
const OtpInput = ({ onComplete, resetKey }) => {
  const [vals, setVals] = useState(['', '', '', '', '', '']);
  const r0 = useRef(null), r1 = useRef(null), r2 = useRef(null),
        r3 = useRef(null), r4 = useRef(null), r5 = useRef(null);
  const refs = [r0, r1, r2, r3, r4, r5];

  // Reset internal state when resetKey changes
  React.useEffect(() => {
    setVals(['', '', '', '', '', '']);
    onComplete('');
    setTimeout(() => refs[0].current?.focus(), 50);
  }, [resetKey]);

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...vals]; next[i] = v; setVals(next);
    onComplete(next.join(''));
    if (v && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !vals[i] && i > 0) {
      const next = [...vals]; next[i - 1] = ''; setVals(next);
      onComplete(next.join(''));
      refs[i - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setVals(next);
    onComplete(next.join(''));
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  return (
    <div className="otp-container" onPaste={handlePaste}>
      {vals.map((v, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={v} className="otp-box"
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

const ForgotPassword = () => {
  const [step,        setStep]        = useState(1);
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const [countdown,   setCountdown]   = useState(0);

  const { showToast } = useContext(ToastContext);
  const navigate      = useNavigate();

  const startCountdown = () => {
    setCountdown(30);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await post('/auth/forgot-password', { email });
      showToast('OTP sent to your email', 'success');
      setStep(2);
      startCountdown();
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await post('/auth/forgot-password', { email });
      showToast('New OTP sent', 'success');
      // Clear the OTP input boxes
      setOtp('');
      setOtpResetKey(k => k + 1);
      startCountdown();
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setResending(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (otp.replace(/\s/g, '').length < 6) { showToast('Enter the 6-digit OTP', 'error'); return; }
    if (newPassword !== confirm)            { showToast('Passwords do not match', 'error'); return; }
    if (newPassword.length < 6)            { showToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      await post('/auth/reset-password', { email, otp: parseInt(otp), new_password: newPassword });
      showToast('Password reset successfully!', 'success');
      navigate('/login');
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo"><Logo />AuctionEdge</div>

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <h1 className="auth-title">Forgot password?</h1>
              <p className="auth-sub">Enter your email and we'll send a reset code</p>
            </div>

            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label>Email address</label>
                <input type="email" className="input-field" placeholder="you@example.com"
                  required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ padding: '11px', fontSize: '0.9rem' }} disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.84rem', color: 'var(--text-soft)' }}>
              <Link to="/login" style={{ fontWeight: 600 }}>← Back to sign in</Link>
            </p>
          </>
        )}

        {/* ── Step 2: OTP + New password ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--warning-soft)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h1 className="auth-title">Check your inbox</h1>
              <p className="auth-sub" style={{ marginBottom: 0 }}>
                OTP sent to <strong style={{ color: 'var(--text-strong)' }}>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleReset}>
              <OtpInput onComplete={setOtp} resetKey={otpResetKey} />

              <div className="form-group" style={{ marginTop: 8 }}>
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} className="input-field"
                    placeholder="Min. 6 characters" required
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-muted)', padding: 4 }}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" className="input-field" placeholder="Repeat password" required
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ padding: '11px', fontSize: '0.9rem' }}
                disabled={loading || otp.replace(/\s/g, '').length < 6}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            {/* Resend */}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" onClick={resendOtp} disabled={countdown > 0 || resending}
                style={{ background: 'none', border: 'none', fontSize: '0.84rem', color: countdown > 0 ? 'var(--text-muted)' : 'var(--accent)', cursor: countdown > 0 ? 'default' : 'pointer', fontWeight: 600 }}>
                {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending…' : 'Resend OTP'}
              </button>
            </div>

            <button type="button" onClick={() => setStep(1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '0.82rem', margin: '12px auto 0', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
