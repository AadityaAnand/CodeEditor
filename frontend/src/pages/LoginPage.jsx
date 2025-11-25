import React from 'react';
import Login from '../components/Auth/Login';

export default function LoginPage({ apiBase, onAuth }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Login apiBase={apiBase} onSuccess={onAuth} onCancel={() => window.history.back()} />
        <div className="auth-alt">Need an account? <a href="/register">Register</a></div>
      </div>
    </div>
  );
}
