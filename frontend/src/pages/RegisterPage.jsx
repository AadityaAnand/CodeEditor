import React from 'react';
import Register from '../components/Auth/Register';

export default function RegisterPage({ apiBase, onAuth }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Register apiBase={apiBase} onSuccess={onAuth} onCancel={() => window.history.back()} />
        <div className="auth-alt">Already have an account? <a href="/login">Login</a></div>
      </div>
    </div>
  );
}
