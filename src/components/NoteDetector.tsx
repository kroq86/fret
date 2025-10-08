import React, { useEffect, useState, useRef } from 'react';
import { PitchyProcessor } from '../utils/pitchyProcessor';
import { findCompatibleScales, NOTES, Scale, SCALES } from '../utils/scales';
import { Fretboard } from './Fretboard';
import { BackingTrackControls } from './BackingTrackControls';
import '../styles/NoteDetector.css';

export const NoteDetector: React.FC = () => {
  const [playedNotes, setPlayedNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const audioProcessorRef = useRef<PitchyProcessor | null>(null);

  useEffect(() => {
    console.log('NoteDetector mounted');
    audioProcessorRef.current = new PitchyProcessor();
    
    const startListening = async () => {
      try {
        if (audioProcessorRef.current) {
          await audioProcessorRef.current.startListening();
          // After initial permission, enumerate devices
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
          setDevices(audioInputs);
          if (audioInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(null);
          }
        }
      } catch (err) {
        console.error('Error starting audio:', err);
        setError('Error accessing microphone. Please check your permissions.');
      }
    };
    
    startListening();

    return () => {
      console.log('NoteDetector unmounted');
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopListening();
      }
    };
  }, []);

  // When device selection changes, switch input
  useEffect(() => {
    const switchInput = async () => {
      if (!audioProcessorRef.current) return;
      try {
        await audioProcessorRef.current.switchDevice(selectedDeviceId);
      } catch (e) {
        console.error('Failed to switch device', e);
        setError('Failed to switch audio device.');
      }
    };
    if (audioProcessorRef.current) {
      switchInput();
    }
  }, [selectedDeviceId]);

  const handleNoteDetected = (event: CustomEvent) => {
    if (isFrozen) return;
    
    const note = event.detail.note;
    const frequency = event.detail.frequency;
    const clarity = event.detail.clarity;
    
    setDebugInfo(prev => {
      const newInfo = [`${new Date().toLocaleTimeString()}: ${note} (${frequency.toFixed(2)} Hz, clarity: ${clarity.toFixed(2)})`, ...prev];
      return newInfo.slice(0, 10);
    });
    
    setPlayedNotes(prev => {
      const newNotes = [...prev, note];
      return newNotes.slice(-3);
    });
  };

  useEffect(() => {
    window.addEventListener('noteDetected', handleNoteDetected as EventListener);
    return () => {
      window.removeEventListener('noteDetected', handleNoteDetected as EventListener);
    };
  }, [isFrozen]);

  const toggleFreeze = () => {
    setIsFrozen(!isFrozen);
  };

  const toggleDebugMode = () => {
    setIsDebugMode(!isDebugMode);
  };

  const findBestScale = () => {
    if (playedNotes.length < 2) return null;
    
    const notesWithoutOctaves = playedNotes.map(note => note.replace(/\d+$/, ''));
    
    const hasFsharp = notesWithoutOctaves.includes('F#');
    const hasGsharp = notesWithoutOctaves.includes('G#');
    const hasF = notesWithoutOctaves.includes('F');
    
    if (hasFsharp && hasGsharp && hasF) {
      const minorScales = SCALES.filter(scale => scale.name === 'Natural Minor' || scale.name === 'Harmonic Minor');
      const fsharpMinor = minorScales.map(scale => ({ scale, root: 'F#' }));
      
      if (fsharpMinor.length > 0) {
        return fsharpMinor[0];
      }
    }
    
    const allScales = playedNotes.flatMap(note => findCompatibleScales(note));
    
    const scaleCounter = new Map<string, {count: number, scale: {scale: Scale, root: string}}>();
    allScales.forEach(scale => {
      const key = `${scale.root} ${scale.scale.name}`;
      const current = scaleCounter.get(key);
      if (current) {
        current.count += 1;
      } else {
        scaleCounter.set(key, { count: 1, scale });
      }
    });
    
    let bestMatches: {key: string, count: number, scale: {scale: Scale, root: string}}[] = [];
    let highestCount = 0;
    
    for (const [key, data] of scaleCounter.entries()) {
      if (data.count > highestCount) {
        highestCount = data.count;
        bestMatches = [{ key, count: data.count, scale: data.scale }];
      } else if (data.count === highestCount) {
        bestMatches.push({ key, count: data.count, scale: data.scale });
      }
    }
    
    if (hasFsharp && hasGsharp && hasF) {
      const minorMatch = bestMatches.find(match => 
        match.scale.root === 'F#' && 
        (match.scale.scale.name === 'Natural Minor' || match.scale.scale.name === 'Harmonic Minor')
      );
      
      if (minorMatch) {
        return minorMatch.scale;
      }
    }
    
    if (bestMatches.length > 0) {
      return bestMatches[0].scale;
    }
    
    return null;
  };

  const findRelatedScales = (scale: { scale: Scale; root: string }) => {
    const rootIndex = NOTES.indexOf(scale.root);
    const relatedScales = [
      { name: 'Subdominant', root: NOTES[(rootIndex + 5) % 12], scale: scale.scale },
      { name: 'Dominant', root: NOTES[(rootIndex + 7) % 12], scale: scale.scale },
      { name: 'Submediant', root: NOTES[(rootIndex + 9) % 12], scale: scale.scale },
      { name: 'Supertonic', root: NOTES[(rootIndex + 2) % 12], scale: scale.scale },
      { name: 'Mediant', root: NOTES[(rootIndex + 4) % 12], scale: scale.scale },
    ];
    return relatedScales;
  };

  const bestScale = findBestScale();
  const relatedScales = bestScale ? findRelatedScales(bestScale) : null;

  return (
    <div className="note-detector">
      <div className="controls">
        <div className="control-buttons">
          <button 
            onClick={toggleFreeze}
            className={`freeze-button ${isFrozen ? 'active' : ''}`}
          >
            {isFrozen ? 'Resume' : 'Freeze'}
          </button>
          <button 
            onClick={toggleDebugMode}
            className={`debug-button ${isDebugMode ? 'active' : ''}`}
          >
            {isDebugMode ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
        
        {/* Audio input selector: always visible */}
        <div className="device-selector" style={{ margin: '8px 0' }}>
          <label htmlFor="audioDevice" style={{ marginRight: 8 }}>Input</label>
          <select
            id="audioDevice"
            value={selectedDeviceId ?? ''}
            onChange={(e) => setSelectedDeviceId(e.target.value || null)}
          >
            <option value="">Default</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || 'Audio input'}</option>
            ))}
          </select>
        </div>
        
        <div className="played-notes">
          {playedNotes.length > 0 && (
            <>
              <div>Played notes: {playedNotes.join(', ')}</div>
              {bestScale && (
                <div className="detected-scale">
                  Detected Scale: {bestScale.root} {bestScale.scale.name}
                </div>
              )}
            </>
          )}
        </div>
        
        <BackingTrackControls bestScale={bestScale} />
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {isDebugMode && (
        <div className="debug-info">
          <h4>Debug Information</h4>
          <div className="debug-log">
            {debugInfo.map((info, index) => (
              <div key={index} className="debug-entry">{info}</div>
            ))}
          </div>
        </div>
      )}
      
      <Fretboard 
        playedNotes={playedNotes}
        bestScale={bestScale}
        relatedScales={relatedScales}
      />
    </div>
  );
}; 