import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const _links = [
    { name: "Home", path: "/" },
    { name: "Tutor", path: "/tutor" }
  ];

  return (
    <nav style={{ padding: '15px', background: '#333', color: '#fff', display: 'flex', gap: '20px' }}>
      <h3>StudyPulse AI</h3>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</Link>
        <Link to="/tutor" style={{ color: '#fff', textDecoration: 'none' }}>Tutor</Link>
      </div>
    </nav>
  );
}
