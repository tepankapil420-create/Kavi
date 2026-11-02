import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ color: '#111827' }}>Welcome to Kavi</h1>
      <p style={{ color: '#4b5563', fontSize: '18px' }}>
        Your brand catalogue is coming soon!
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
