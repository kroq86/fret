import { useState, useRef, useCallback } from 'react';
import { frequencyToNote, Note } from './music';

// Interface for the audio detection context
interface AudioDetectionContext {
  isListening: boolean;
  start: () => Promise<void>;
  stop: () => void;
  getDetectedNote: () => Note | null;
}

// Create the audio detection hook
export function useAudioDetection(): AudioDetectionContext {
  const [isListening, setIsListening] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Start audio detection
  const start = useCallback(async (): Promise<void> => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context and analyzer
      const context = new window.AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyzerNode = context.createAnalyser();
      
      // Configure analyzer
      analyzerNode.fftSize = 2048;
      analyzerNode.smoothingTimeConstant = 0.8;
      
      // Connect the source to the analyzer
      source.connect(analyzerNode);
      
      // Save references
      audioContextRef.current = context;
      analyzerRef.current = analyzerNode;
      mediaStreamRef.current = stream;
      setIsListening(true);
      
    } catch (error) {
      console.error('Error starting audio detection:', error);
    }
  }, []);

  // Stop audio detection
  const stop = useCallback((): void => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    // Reset refs
    audioContextRef.current = null;
    analyzerRef.current = null;
    mediaStreamRef.current = null;
    setIsListening(false);
  }, []);

  // Get the current detected note
  const getDetectedNote = useCallback((): Note | null => {
    if (!analyzerRef.current || !isListening || !audioContextRef.current) {
      return null;
    }
    
    // Get frequency data
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyzerRef.current.getFloatFrequencyData(dataArray);
    
    // Find the peak frequency
    let peakFrequency = 0;
    let peakValue = -Infinity;
    
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > peakValue) {
        peakValue = dataArray[i];
        peakFrequency = i * (audioContextRef.current.sampleRate / bufferLength);
      }
    }
    
    // Convert frequency to note
    if (peakFrequency > 0) {
      return frequencyToNote(peakFrequency);
    }
    
    return null;
  }, [isListening]);

  return {
    isListening,
    start,
    stop,
    getDetectedNote
  };
} 