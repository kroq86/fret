import React from 'react';
import { Fretboard } from './Fretboard';
import { NoteDetector } from './NoteDetector';
import '../styles/App.css';

export const App: React.FC = () => {
  return (
    <div className="app">
      <NoteDetector />
    </div>
  );
}; 