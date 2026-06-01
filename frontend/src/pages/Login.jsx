import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 13L3 22h10l7-7"/><path d="m14.5 2.5 7 7-4.5 4.5-7-7z"/>
  </svg>
);

const Login = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const { login }      = useContext(AuthContext);
  const { showToast }  = useContext(ToastContext);
  const navigate       = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post('/auth/login', { email, password });
      login(res.access_token, res.user);
      showToast(`Welcome back, ${res.user.username}!`, 'success');
      navigate(res.user.is_admin ? '/admin' : '/');
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
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Enter your credentials to access your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="input-field" placeholder="you@example.com"
              required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <label style={{ margin:0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize:'0.78rem' }}>Forgot password?</Link>
            </div>
            <div style={{ position:'relative' }}>
              <input type={showPass ? 'text' : 'password'} className="input-field"
                placeholder="Your password" required value={password}
                onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', color:'var(--text-muted)', padding:4 }}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full"
            style={{ padding:'11px', fontSize:'0.9rem', marginTop:4 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials — display only, no fill buttons */}
        <div style={{ marginTop:20, padding:14, background:'var(--bg-raised)', borderRadius:'var(--radius)', border:'1px solid var(--border-subtle)' }}>
          <div style={{ fontSize:'0.72rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:10 }}>Demo Credentials</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { role:'Admin', e:'admin@auctionedge.com', p:'Admin@123' },
              { role:'User',  e:'alice@demo.com',        p:'Demo@123' },
            ].map(d => (
              <div key={d.role} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', minWidth:36 }}>{d.role}</span>
                <div style={{ flex:1, fontFamily:"'DM Mono',monospace", fontSize:'0.75rem', color:'var(--text-base)' }}>
                  {d.e}
                </div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.75rem', color:'var(--text-soft)', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'2px 8px' }}>
                  {d.p}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:'0.84rem', color:'var(--text-soft)' }}>
          No account? <Link to="/register" style={{ fontWeight:600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
