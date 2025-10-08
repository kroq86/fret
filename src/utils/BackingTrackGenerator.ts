import { Scale } from './scales';

interface DrumPattern {
  name: string;
  pattern: number[][];
  bpm: number;
}

interface BackingTrackOptions {
  tempo: number;
  style: 'rock' | 'jazz' | 'blues' | 'pop';
  complexity: 'simple' | 'medium' | 'complex';
}

/**
 * Manages the generation and playback of backing tracks based on detected scales
 */
export class BackingTrackGenerator {
  private audioContext: AudioContext;
  private masterGainNode: GainNode;
  private isPlaying: boolean = false;
  private currentTrack: {
    scale: { scale: Scale; root: string };
    options: BackingTrackOptions;
    nodes: AudioNode[];
    intervalId?: number;
  } | null = null;

  // Default options
  private defaultOptions: BackingTrackOptions = {
    tempo: 90,
    style: 'rock',
    complexity: 'simple'
  };

  // Drum patterns by style
  private drumPatterns: Record<string, DrumPattern[]> = {
    rock: [
      {
        name: 'Basic Rock',
        pattern: [
          [1, 0, 0, 0, 1, 0, 0, 0], // Kick (1 = hit, 0 = rest)
          [0, 0, 1, 0, 0, 0, 1, 0], // Snare
          [1, 1, 1, 1, 1, 1, 1, 1]  // Hi-hat
        ],
        bpm: 90
      },
      {
        name: 'Rock Shuffle',
        pattern: [
          [1, 0, 0, 0, 1, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 1, 0],
          [1, 0, 1, 0, 1, 0, 1, 0]
        ],
        bpm: 100
      }
    ],
    jazz: [
      {
        name: 'Swing',
        pattern: [
          [1, 0, 0, 0, 1, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 1, 0],
          [1, 0, 1, 0, 1, 0, 1, 0]
        ],
        bpm: 120
      }
    ],
    blues: [
      {
        name: 'Slow Blues',
        pattern: [
          [1, 0, 0, 1, 0, 0, 1, 0],
          [0, 0, 1, 0, 0, 1, 0, 0],
          [1, 1, 1, 1, 1, 1, 1, 1]
        ],
        bpm: 70
      }
    ],
    pop: [
      {
        name: 'Pop Beat',
        pattern: [
          [1, 0, 0, 0, 1, 0, 1, 0],
          [0, 0, 1, 0, 0, 0, 1, 0],
          [1, 1, 1, 1, 1, 1, 1, 1]
        ],
        bpm: 110
      }
    ]
  };

  constructor() {
    this.audioContext = new AudioContext();
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.value = 0.7; // Set initial volume
    this.masterGainNode.connect(this.audioContext.destination);
  }

  /**
   * Generate a chord progression based on the scale
   */
  private generateChordProgression(scale: { scale: Scale; root: string }): string[] {
    // Basic chord progressions based on scale type
    const progressions: Record<string, number[][]> = {
      'Major': [
        [1, 4, 5, 1],          // I-IV-V-I (basic)
        [1, 6, 4, 5],          // I-vi-IV-V (pop)
        [1, 5, 6, 4],          // I-V-vi-IV (common pop)
        [2, 5, 1, 6, 2, 5, 1], // ii-V-I-vi-ii-V-I (jazz)
      ],
      'Natural Minor': [
        [1, 4, 5, 1],          // i-iv-v-i
        [1, 6, 3, 7],          // i-VI-III-VII
        [1, 7, 6, 7],          // i-VII-VI-VII
        [1, 4, 7, 3]           // i-iv-VII-III
      ],
      'Harmonic Minor': [
        [1, 4, 5, 1],          // i-iv-V-i (with major V)
        [1, 6, 5, 1],          // i-VI-V-i
        [1, 4, 6, 5]           // i-iv-VI-V
      ],
      'Pentatonic Major': [
        [1, 5, 6, 4],          // I-V-vi-IV
        [1, 6, 5, 4]           // I-vi-V-IV
      ],
      'Pentatonic Minor': [
        [1, 4, 5, 1],          // i-iv-v-i
        [1, 7, 6, 1]           // i-VII-VI-i
      ],
      'Blues': [
        [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5], // 12-bar blues
        [1, 4, 1, 1, 4, 4, 1, 1, 5, 4, 1, 1]   // variation
      ]
    };

    // Get progression options for this scale type
    const scaleType = scale.scale.name;
    const availableProgressions = progressions[scaleType] || progressions['Major'];
    
    // Choose a progression based on complexity
    const progressionDegrees = availableProgressions[Math.floor(Math.random() * availableProgressions.length)];
    
    // Map scale degrees to actual chords
    return this.degreesToChords(progressionDegrees, scale);
  }

  /**
   * Convert scale degrees to actual chord names
   */
  private degreesToChords(degrees: number[], scale: { scale: Scale; root: string }): string[] {
    const { scale: scaleObj, root } = scale;
    const chordTypes = this.getChordTypesForScale(scaleObj.name);
    
    // Get all notes in the scale
    const rootIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(root);
    const scaleNotes = scaleObj.intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][noteIndex];
    });
    
    // Map degrees to chords
    return degrees.map(degree => {
      // Adjust to 0-indexed
      const index = (degree - 1) % scaleNotes.length;
      const chordRoot = scaleNotes[index];
      const chordType = chordTypes[index];
      return `${chordRoot}${chordType}`;
    });
  }

  /**
   * Get appropriate chord types for each degree of the scale
   */
  private getChordTypesForScale(scaleType: string): string[] {
    switch (scaleType) {
      case 'Major':
        return ['', 'm', 'm', '', '', 'm', 'dim'];
      case 'Natural Minor':
        return ['m', 'dim', '', 'm', 'm', '', ''];
      case 'Harmonic Minor':
        return ['m', 'dim', 'aug', 'm', '', '', 'dim'];
      case 'Pentatonic Major':
        return ['', '', 'm', '', '', ''];
      case 'Pentatonic Minor':
        return ['m', '', 'm', '', '', ''];
      case 'Blues':
        return ['7', '7', 'm7', '7', '7', 'm7'];
      default:
        return ['', 'm', 'm', '', '', 'm', 'dim'];
    }
  }

  /**
   * Create a drum sound
   */
  private createDrumSound(type: 'kick' | 'snare' | 'hihat'): OscillatorNode | AudioBufferSourceNode {
    const now = this.audioContext.currentTime;
    
    if (type === 'kick') {
      // Kick drum using oscillator
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      gainNode.gain.setValueAtTime(1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGainNode);
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      
      return oscillator;
    } else if (type === 'snare') {
      // Snare drum using noise
      const bufferSize = this.audioContext.sampleRate * 0.1; // 100ms buffer
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      // Fill with white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.setValueAtTime(1, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      noise.connect(noiseGain);
      noiseGain.connect(this.masterGainNode);
      
      noise.start(now);
      
      return noise;
    } else {
      // Hi-hat using filtered noise
      const bufferSize = this.audioContext.sampleRate * 0.05; // 50ms buffer
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      // Fill with white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      
      // High-pass filter for hi-hat
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGainNode);
      
      noise.start(now);
      
      return noise;
    }
  }

  /**
   * Create a bass note
   */
  private createBassNote(note: string, duration: number): OscillatorNode {
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Convert note name to frequency
    const freq = this.noteToFrequency(note, 2); // Octave 2 for bass
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, now);
    
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.setValueAtTime(0.8, now + duration * 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGainNode);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    return oscillator;
  }

  /**
   * Create a chord
   */
  private createChord(chordName: string, duration: number): OscillatorNode[] {
    const notes = this.chordToNotes(chordName);
    const oscillators: OscillatorNode[] = [];
    
    notes.forEach((note, index) => {
      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Convert note name to frequency (octave 3 for chords)
      const freq = this.noteToFrequency(note, 3);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      // Lower volume for chord notes to avoid overpowering
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.setValueAtTime(0.2, now + duration * 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGainNode);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
      
      oscillators.push(oscillator);
    });
    
    return oscillators;
  }

  /**
   * Convert a chord name to array of notes
   */
  private chordToNotes(chordName: string): string[] {
    // Extract root note and chord type
    const match = chordName.match(/^([A-G]#?)([a-z0-9]*)$/);
    if (!match) return [];
    
    const [, root, type] = match;
    
    // Define intervals for different chord types
    const intervals: Record<string, number[]> = {
      '': [0, 4, 7],        // Major triad
      'm': [0, 3, 7],       // Minor triad
      '7': [0, 4, 7, 10],   // Dominant 7th
      'maj7': [0, 4, 7, 11], // Major 7th
      'm7': [0, 3, 7, 10],   // Minor 7th
      'dim': [0, 3, 6],      // Diminished
      'aug': [0, 4, 8]       // Augmented
    };
    
    // Get intervals for this chord type
    const chordIntervals = intervals[type] || intervals[''];
    
    // Map intervals to actual notes
    const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(root);
    return chordIntervals.map(interval => {
      const index = (noteIndex + interval) % 12;
      return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][index];
    });
  }

  /**
   * Convert note name to frequency
   */
  private noteToFrequency(note: string, octave: number): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = notes.indexOf(note);
    
    if (noteIndex === -1) return 440; // Default to A4 if note not found
    
    // A4 is 440Hz (A at octave 4)
    // Each octave doubles the frequency
    // Each semitone is multiplied by 2^(1/12)
    
    // Calculate semitones from A4
    const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - notes.indexOf('A'));
    
    // Calculate frequency: 440Hz * 2^(semitones/12)
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  /**
   * Start playing a backing track based on the detected scale
   */
  public play(scale: { scale: Scale; root: string }, options: Partial<BackingTrackOptions> = {}): void {
    // Stop current track if playing
    this.stop();
    
    // Resume AudioContext if it's suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Merge default options with provided options
    const mergedOptions: BackingTrackOptions = {
      ...this.defaultOptions,
      ...options
    };
    
    // Generate chord progression
    const chords = this.generateChordProgression(scale);
    console.log('Generated chord progression:', chords);
    
    // Choose a drum pattern based on style
    const styleDrumPatterns = this.drumPatterns[mergedOptions.style] || this.drumPatterns.rock;
    const drumPattern = styleDrumPatterns[0];
    
    // Calculate timing based on tempo
    const beatDuration = 60 / mergedOptions.tempo;
    const measureDuration = beatDuration * 8; // Assuming 4/4 time with 8 divisions
    
    // Start playing
    this.isPlaying = true;
    let currentChordIndex = 0;
    let currentBeatIndex = 0;
    const audioNodes: AudioNode[] = [];
    
    // Store current track info
    this.currentTrack = {
      scale,
      options: mergedOptions,
      nodes: audioNodes
    };
    
    // Play function that runs on interval
    const playBeat = () => {
      if (!this.isPlaying) return;
      
      // Play drums based on pattern
      if (drumPattern.pattern[0][currentBeatIndex] === 1) {
        audioNodes.push(this.createDrumSound('kick'));
      }
      if (drumPattern.pattern[1][currentBeatIndex] === 1) {
        audioNodes.push(this.createDrumSound('snare'));
      }
      if (drumPattern.pattern[2][currentBeatIndex] === 1) {
        audioNodes.push(this.createDrumSound('hihat'));
      }
      
      // Play chord on the first beat of measure or when changing chords
      if (currentBeatIndex === 0 || currentBeatIndex === 4) {
        const chord = chords[currentChordIndex];
        const chordNotes = this.chordToNotes(chord);
        
        if (chordNotes.length > 0) {
          // Play bass note (root of chord)
          audioNodes.push(this.createBassNote(chordNotes[0], beatDuration * 4));
          
          // Play chord
          audioNodes.push(...this.createChord(chord, beatDuration * 4));
        }
        
        // Advance to next chord every 8 beats
        if (currentBeatIndex === 0) {
          currentChordIndex = (currentChordIndex + 1) % chords.length;
        }
      }
      
      // Advance to next beat
      currentBeatIndex = (currentBeatIndex + 1) % 8;
    };
    
    // Start the interval for playing
    this.currentTrack.intervalId = window.setInterval(playBeat, beatDuration * 1000);
    
    // Start immediately
    playBeat();
  }

  /**
   * Stop the current backing track
   */
  public stop(): void {
    this.isPlaying = false;
    
    // Clear interval if exists
    if (this.currentTrack?.intervalId) {
      clearInterval(this.currentTrack.intervalId);
    }
    
    // Fade out all active nodes
    if (this.currentTrack?.nodes) {
      const now = this.audioContext.currentTime;
      
      // Set gain to zero for smooth fade out
      this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, now);
      this.masterGainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      // Reset gain after fade out
      setTimeout(() => {
        this.masterGainNode.gain.setValueAtTime(0.7, this.audioContext.currentTime);
      }, 100);
    }
    
    this.currentTrack = null;
  }

  /**
   * Set the volume of the backing track
   */
  public setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.setValueAtTime(normalizedVolume, this.audioContext.currentTime);
  }

  /**
   * Check if a backing track is currently playing
   */
  public isBackingTrackPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current track info
   */
  public getCurrentTrack(): { scale: { scale: Scale; root: string }; options: BackingTrackOptions } | null {
    if (!this.currentTrack) return null;
    
    return {
      scale: this.currentTrack.scale,
      options: this.currentTrack.options
    };
  }
} 