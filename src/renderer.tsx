import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { Capacitor } from '@capacitor/core';
import './styles/App.css';

// Initialize Capacitor
if (Capacitor.isNativePlatform()) {
  // Mobile-specific initialization
  console.log('Running on native platform:', Capacitor.getPlatform());
  
  // Prevent default touch behaviors
  document.addEventListener('touchstart', (e) => {
    // Allow default for interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.tagName === 'INPUT') {
      return;
    }
  }, { passive: true });
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} 