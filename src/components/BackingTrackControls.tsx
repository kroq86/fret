import React, { useEffect, useState, useRef } from 'react';
import { BackingTrackGenerator } from '../utils/BackingTrackGenerator';
import { Scale } from '../utils/scales';
import '../styles/BackingTrackControls.css';

interface BackingTrackControlsProps {
  bestScale: { scale: Scale; root: string } | null;
}

export const BackingTrackControls: React.FC<BackingTrackControlsProps> = ({ bestScale }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(70);
  const [tempo, setTempo] = useState<number>(90);
  const [style, setStyle] = useState<'rock' | 'jazz' | 'blues' | 'pop'>('rock');
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('simple');
  
  const generatorRef = useRef<BackingTrackGenerator | null>(null);
  
  // Initialize the generator on component mount
  useEffect(() => {
    generatorRef.current = new BackingTrackGenerator();
    
    // Cleanup on unmount
    return () => {
      if (generatorRef.current && isPlaying) {
        generatorRef.current.stop();
      }
    };
  }, []);
  
  // Update playing state when scale changes
  useEffect(() => {
    if (bestScale && isPlaying && generatorRef.current) {
      // Only restart if we're already playing
      generatorRef.current.play(bestScale, {
        tempo,
        style, 
        complexity
      });
    }
  }, [bestScale, tempo, style, complexity]);
  
  // Handle play/stop
  const togglePlayback = () => {
    if (!generatorRef.current) return;
    
    if (isPlaying) {
      generatorRef.current.stop();
      setIsPlaying(false);
    } else {
      if (bestScale) {
        generatorRef.current.play(bestScale, {
          tempo,
          style,
          complexity
        });
        setIsPlaying(true);
      }
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    if (generatorRef.current) {
      generatorRef.current.setVolume(newVolume / 100);
    }
  };
  
  // Handle tempo change
  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempo(parseInt(e.target.value));
  };
  
  // Handle style change
  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStyle(e.target.value as 'rock' | 'jazz' | 'blues' | 'pop');
  };
  
  // Handle complexity change
  const handleComplexityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setComplexity(e.target.value as 'simple' | 'medium' | 'complex');
  };
  
  return (
    <div className="backing-track-controls">
      <h3>Backing Track</h3>
      
      <div className="control-row">
        <button 
          className={`play-button ${isPlaying ? 'active' : ''}`}
          onClick={togglePlayback}
          disabled={!bestScale}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        
        <div className="volume-control">
          <label htmlFor="volume">Volume</label>
          <input 
            type="range" 
            id="volume" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={handleVolumeChange}
          />
          <span>{volume}%</span>
        </div>
      </div>
      
      <div className="control-row">
        <div className="tempo-control">
          <label htmlFor="tempo">Tempo</label>
          <input 
            type="range" 
            id="tempo" 
            min="60" 
            max="160" 
            value={tempo} 
            onChange={handleTempoChange}
          />
          <span>{tempo} BPM</span>
        </div>
      </div>
      
      <div className="control-row settings">
        <div className="select-control">
          <label htmlFor="style">Style</label>
          <select id="style" value={style} onChange={handleStyleChange}>
            <option value="rock">Rock</option>
            <option value="jazz">Jazz</option>
            <option value="blues">Blues</option>
            <option value="pop">Pop</option>
          </select>
        </div>
        
        <div className="select-control">
          <label htmlFor="complexity">Complexity</label>
          <select id="complexity" value={complexity} onChange={handleComplexityChange}>
            <option value="simple">Simple</option>
            <option value="medium">Medium</option>
            <option value="complex">Complex</option>
          </select>
        </div>
      </div>
      
      <div className="scale-info">
        {bestScale ? (
          <p>Current scale: <strong>{bestScale.root} {bestScale.scale.name}</strong></p>
        ) : (
          <p>Play notes to detect a scale</p>
        )}
      </div>
    </div>
  );
}; 