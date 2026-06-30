import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessages } from '../services/authErrorUtils';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated, loading } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    year: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormErrors([]);

    if (formData.password !== formData.confirmPassword) {
      setFormErrors(['Passwords do not match.']);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        department: formData.department,
        year: formData.year,
        password: formData.password,
      });
      navigate(from, { replace: true });
    } catch (error) {
      setFormErrors(
        getAuthErrorMessages(
          error,
          'Registration failed. Please check your details and try again.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card page-card">
        <div className="auth-header">
          <h1>Register</h1>
          <p>Create your college account to access the Lost, Found, and Sell dashboard.</p>
        </div>

        {formErrors.length > 0 ? (
          <div className="form-alert">
            <ul>
              {formErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Full name</span>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </label>

          <label className="form-group">
            <span>College email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@college.edu"
              required
            />
          </label>

          <label className="form-group">
            <span>Department</span>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Department name"
              required
            />
          </label>

          <label className="form-group">
            <span>Year</span>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="e.g. 1st Year"
              required
            />
          </label>

          <label className="form-group">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create password"
              required
            />
          </label>

          <label className="form-group">
            <span>Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              required
            />
          </label>

          <button className="btn auth-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Register;
