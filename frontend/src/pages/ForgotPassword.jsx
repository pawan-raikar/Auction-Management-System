import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../api';
import { ToastContext } from '../context/ToastContext';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post('/auth/forgot-password', { email });
      showToast(res.message, "success");
      setStep(2);
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    
    setLoading(true);
    try {
      const res = await post('/auth/reset-password', { 
        email, 
        otp: parseInt(otp), 
        new_password: newPassword 
      });
      showToast(res.message, "success");
      navigate('/login');
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card glass">
        <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>
          {step === 1 ? 'Reset Password' : 'New Password'}
        </h2>
        
        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Enter your email to receive an OTP.
            </p>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="input-field" required
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link to="/login" style={{ color: 'var(--text-secondary)' }}>Back to Login</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>OTP</label>
              <input type="text" className="input-field" required maxLength="6"
                value={otp} onChange={e => setOtp(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" className="input-field" required
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" className="input-field" required
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
