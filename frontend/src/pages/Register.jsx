import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    
    setLoading(true);
    try {
      const res = await post('/auth/register', { 
        username: formData.username, 
        email: formData.email, 
        password: formData.password 
      });
      if (res.message.includes("Dev OTP")) {
        alert(res.message);
      } else {
        showToast(res.message, "success");
      }
      setStep(2);
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await post('/auth/verify-otp', { email: formData.email, otp: parseInt(otp) });
      login(res.access_token, res.user);
      showToast("Registration successful", "success");
      navigate('/');
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
          {step === 1 ? 'Create Account' : 'Verify Email'}
        </h2>
        
        {step === 1 ? (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" className="input-field" required
                value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="input-field" required
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="input-field" required
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" className="input-field" required
                value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Next'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Enter the 6-digit OTP sent to {formData.email}
            </p>
            <div className="form-group">
              <label>OTP</label>
              <input type="text" className="input-field" required maxLength="6"
                value={otp} onChange={e => setOtp(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button type="button" onClick={handleRegister} className="btn-secondary" style={{ border: 'none' }}>
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
