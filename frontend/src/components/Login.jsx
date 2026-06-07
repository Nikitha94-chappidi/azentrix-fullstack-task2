import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ API_URL, onLoginSuccess, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please try again.');
      }

      // Successful login
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Login to collaborate on your boards</p>
        </div>

        {error && (
          <div style={{ 
            background: 'var(--priority-high-bg)', 
            color: 'var(--priority-high)', 
            padding: '0.75rem 1rem', 
            borderRadius: '10px', 
            fontSize: '0.85rem',
            fontWeight: 500,
            marginBottom: '1.25rem',
            border: '1px solid hsla(351, 89%, 60%, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="e.g. member, admin, or your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                disabled={loading}
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1.25rem' }}
            disabled={loading}
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <p className="auth-switch-link">
          Don't have an account? <span onClick={onSwitchToRegister}>Register here</span>
        </p>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px dashed var(--color-border)',
          fontSize: '0.85rem',
          color: 'var(--color-text-primary)',
          textAlign: 'center'
        }}>
          <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>Quick testing accounts:</p>
          <p style={{ marginBottom: '0.25rem' }}>Admin: <strong style={{ color: 'hsl(252, 90%, 65%)', background: 'var(--priority-low-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>admin</strong> / <strong style={{ color: 'hsl(252, 90%, 65%)', background: 'var(--priority-low-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>admin123</strong></p>
          <p>Member: <strong style={{ color: 'hsl(280, 85%, 55%)', background: 'var(--priority-medium-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>member</strong> / <strong style={{ color: 'hsl(280, 85%, 55%)', background: 'var(--priority-medium-bg)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>member123</strong></p>
        </div>
      </div>
    </div>
  );
}
