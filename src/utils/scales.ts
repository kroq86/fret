export interface Scale {
  name: string;
  intervals: number[];
  description: string;
}

export const SCALES: Scale[] = [
  {
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'Happy, bright sound'
  },
  {
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Sad, melancholic sound'
  },
  {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: 'Exotic, mysterious sound'
  },
  {
    name: 'Pentatonic Major',
    intervals: [0, 2, 4, 7, 9],
    description: 'Versatile, bluesy sound'
  },
  {
    name: 'Pentatonic Minor',
    intervals: [0, 3, 5, 7, 10],
    description: 'Rock, blues sound'
  },
  {
    name: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Bluesy, soulful sound'
  }
];

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteIndex(note: string): number {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return -1;
  
  const [, noteName, octave] = match;
  const noteIndex = NOTES.indexOf(noteName);
  return noteIndex + (parseInt(octave) * 12);
}

export function findCompatibleScales(note: string): { scale: Scale; root: string }[] {
  const noteIndex = getNoteIndex(note);
  if (noteIndex === -1) return [];

  const compatibleScales: { scale: Scale; root: string }[] = [];

  SCALES.forEach(scale => {
    scale.intervals.forEach(interval => {
      const rootIndex = (noteIndex - interval + 12) % 12;
      const rootNote = NOTES[rootIndex];
      compatibleScales.push({ scale, root: rootNote });
    });
  });

  return compatibleScales;
} 