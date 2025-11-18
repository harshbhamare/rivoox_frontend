import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Registration.css';

const API_BASE = 'rivooooox-backnd.vercel.app';

const Login = ({ onLogin, onRegister }) => {
  const [isStudentLogin, setIsStudentLogin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    hallTicket: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isStudentLogin ? '/api/auth/student/login' : '/api/auth/login';
      const payload = isStudentLogin 
        ? { hall_ticket_number: formData.hallTicket, password: formData.password }
        : { email: formData.email, password: formData.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('Login response user data:', data.user || data.student);
        localStorage.setItem('token', data.token);
        const userData = data.user || data.student;
        localStorage.setItem('user', JSON.stringify(userData));
        onLogin(userData);
      } else {
        setError(data.error || (isStudentLogin ? 'Invalid hall ticket or password' : 'Invalid email or password'));
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>{isStudentLogin ? 'Student Login' : 'Sign in to your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isStudentLogin ? (
              <div className="form-field">
                <label>Hall Ticket Number</label>
                <input
                  type="text"
                  placeholder="Enter Your Hall Ticket Number"
                  value={formData.hallTicket}
                  onChange={(e) => setFormData(prev => ({ ...prev, hallTicket: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
            ) : (
              <div className="form-field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Your Password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="auth-footer">
              {isStudentLogin ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsStudentLogin(false);
                      setError('');
                      setFormData({ email: '', password: '', hallTicket: '' });
                    }} 
                    className="link-button"
                  >
                    Login as Teacher/Staff
                  </button>
                </>
              ) : (
                <>
                  Don't have an account? <button type="button" onClick={onRegister} className="link-button">Create Account</button>
                  <br />
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsStudentLogin(true);
                      setError('');
                      setFormData({ email: '', password: '', hallTicket: '' });
                    }} 
                    className="link-button"
                    style={{ marginTop: '10px' }}
                  >
                    Login as Student
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="auth-right">
        <div 
          className="brand-text"
          style={{
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`
          }}
        >
          <div className="brand-line" style={{ transform: `translateX(${mousePos.x * 0.5}px)` }}>RIVOOX</div>
          <div className="brand-line" style={{ transform: `translateX(${mousePos.x * 0.3}px)` }}>RIVOOX</div>
          <div className="brand-line" style={{ transform: `translateX(${mousePos.x * 0.1}px)` }}>RIVOOX</div>
          <div className="brand-line" style={{ transform: `translateX(${mousePos.x * -0.1}px)` }}>RIVOOX</div>
          <div className="brand-line" style={{ transform: `translateX(${mousePos.x * -0.3}px)` }}>RIVOOX</div>
        </div>
        <div className="brand-footer">Rivoox Solutions</div>
      </div>
    </div>
  );
};

export default Login;
