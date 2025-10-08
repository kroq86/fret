// Define type for a musical note
export interface Note {
  name: string;
  octave: number;
}

// All possible notes in chromatic scale
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scale patterns (semitone intervals from root)
const SCALE_PATTERNS = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
};

/**
 * Parses a scale string like "C Major" into root note and scale type
 */
export function parseScale(scaleString: string): { root: string; type: string } {
  const parts = scaleString.split(' ');
  const root = parts[0];
  const type = parts.slice(1).join(' ');
  
  return { root, type };
}

/**
 * Gets all notes in a scale
 */
export function getScaleNotes(scaleString: string): Note[] {
  const { root, type } = parseScale(scaleString);
  
  // Find the pattern for this scale type
  const pattern = SCALE_PATTERNS[type as keyof typeof SCALE_PATTERNS];
  if (!pattern) {
    console.error(`Unknown scale type: ${type}`);
    return [];
  }
  
  // Find the index of the root note
  const rootIndex = NOTES.indexOf(root);
  if (rootIndex === -1) {
    console.error(`Unknown root note: ${root}`);
    return [];
  }
  
  // Generate the scale notes
  return pattern.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    return {
      name: NOTES[noteIndex],
      octave: 4 // Default octave, will be adjusted based on string/fret position
    };
  });
}

/**
 * Calculates the note at a specific position on the fretboard
 */
export function getNoteAtPosition(rootNote: string, fret: number): Note {
  // Parse the root note string (e.g., "E2" -> { name: "E", octave: 2 })
  const rootNameMatch = rootNote.match(/([A-G]#?)(\d)/);
  if (!rootNameMatch) {
    console.error(`Invalid root note: ${rootNote}`);
    return { name: 'C', octave: 4 }; // Default fallback
  }
  
  const rootName = rootNameMatch[1];
  const rootOctave = parseInt(rootNameMatch[2], 10);
  
  // Find the index of the root note
  const rootIndex = NOTES.indexOf(rootName);
  if (rootIndex === -1) {
    console.error(`Unknown note name: ${rootName}`);
    return { name: 'C', octave: 4 }; // Default fallback
  }
  
  // Calculate the new note index and octave
  const noteIndex = (rootIndex + fret) % 12;
  const octaveShift = Math.floor((rootIndex + fret) / 12);
  const octave = rootOctave + octaveShift;
  
  return {
    name: NOTES[noteIndex],
    octave
  };
}

/**
 * Converts a frequency to the closest musical note
 */
export function frequencyToNote(frequency: number): Note | null {
  // A4 is 440Hz
  const A4 = 440;
  
  if (frequency <= 0) {
    return null;
  }
  
  // Calculate the number of semitones away from A4
  const semitoneOffset = 12 * Math.log2(frequency / A4);
  const roundedOffset = Math.round(semitoneOffset);
  
  // Calculate the note index (A is at index 9 in our NOTES array)
  const noteIndex = (9 + roundedOffset) % 12;
  if (noteIndex < 0) {
    return null;
  }
  
  // Calculate the octave
  const octave = 4 + Math.floor((9 + roundedOffset) / 12);
  
  return {
    name: NOTES[noteIndex],
    octave
  };
} 