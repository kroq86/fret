import React, { useEffect, useRef, useState } from 'react';
import '../styles/Fretboard.css';
import { NOTES, Scale } from '../utils/scales';

interface FretboardProps {
  playedNotes: string[];
  bestScale: { scale: Scale; root: string } | null;
  relatedScales: Array<{ name: string; root: string; scale: Scale }> | null;
}

const STRINGS = ['E', 'B', 'G', 'D', 'A', 'E'];
const FRETS = 12;

const getNoteAtPosition = (string: string, fret: number): string => {
  const stringIndex = NOTES.indexOf(string);
  return NOTES[(stringIndex + fret) % 12];
};

const getChordNotes = (root: string, scale: any): string[] => {
  const rootIndex = NOTES.indexOf(root);
  const intervals = scale.intervals;
  return intervals.map((interval: number) => NOTES[(rootIndex + interval) % 12]);
};

const getSubtonicNotes = (root: string, scale: any): string[] => {
  const rootIndex = NOTES.indexOf(root);
  const subtonicIndex = (rootIndex - 1 + 12) % 12;
  return [NOTES[subtonicIndex]];
};

export const Fretboard: React.FC<FretboardProps> = ({ playedNotes, bestScale, relatedScales }) => {
  const fretboardRef = useRef<HTMLCanvasElement>(null);
  const scaleboardRef = useRef<HTMLCanvasElement>(null);
  const [selectedScale, setSelectedScale] = useState<{ name: string; root: string; scale: Scale } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(800);

  // Reset selectedScale when new notes are played
  useEffect(() => {
    setSelectedScale(null);
  }, [playedNotes]);

  // Функция для обновления размеров канваса при изменении размера окна
  const updateCanvasSize = () => {
    const container = fretboardRef.current?.parentElement;
    if (container) {
      const newWidth = Math.max(800, container.clientWidth - 40); // минимальная ширина 800px, учитываем padding
      setCanvasWidth(newWidth);
    }
  };

  useEffect(() => {
    // Инициализация размера и установка слушателя изменения размера
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    if (fretboardRef.current) {
      const ctx = fretboardRef.current.getContext('2d');
      if (ctx) {
        drawFretboard(ctx);
        drawNotes(ctx);
        // Подсвечиваем сыгранные ноты красным
        playedNotes.forEach(note => highlightNote(ctx, note, 'red'));
      }
    }

    if (scaleboardRef.current && bestScale) {
      const ctx = scaleboardRef.current.getContext('2d');
      if (ctx) {
        drawFretboard(ctx);
        drawNotes(ctx);
        
        if (selectedScale) {
          // Если выбран конкретный scale, показываем только его
          const scaleNotes = selectedScale.scale.intervals.map(
            (interval: number) => NOTES[(NOTES.indexOf(selectedScale.root) + interval) % 12]
          );
          scaleNotes.forEach(note => highlightNote(ctx, note, 'green'));
        } else {
          // Иначе показываем все scale'ы
          const scaleNotes = bestScale.scale.intervals.map(
            (interval: number) => NOTES[(NOTES.indexOf(bestScale.root) + interval) % 12]
          );
          scaleNotes.forEach(note => highlightNote(ctx, note, 'green'));

          if (relatedScales) {
            const colors = ['blue', 'purple', 'orange', 'pink', 'brown'];
            relatedScales.forEach((scale, index) => {
              const scaleNotes = scale.scale.intervals.map(
                (interval: number) => NOTES[(NOTES.indexOf(scale.root) + interval) % 12]
              );
              scaleNotes.forEach(note => highlightNote(ctx, note, colors[index]));
            });
          }
        }
      }
    }
  }, [playedNotes, bestScale, relatedScales, selectedScale, canvasWidth]);

  const handleScaleClick = (scale: { name: string; root: string; scale: Scale }) => {
    setSelectedScale(selectedScale?.name === scale.name ? null : scale);
  };

  const drawFretboard = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const stringSpacing = height / (STRINGS.length + 1);
    const fretSpacing = width / (FRETS + 1);

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Заливаем фон
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, width, height);
    
    // Специальный фон для нулевого лада (открытые струны)
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, fretSpacing, height);

    // Рисуем номера ладов
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= FRETS; i++) {
      const x = fretSpacing * i + fretSpacing / 2;
      ctx.fillText(i.toString(), x, height - 5);
    }

    // Draw strings
    STRINGS.forEach((_, i) => {
      const y = stringSpacing * (i + 1);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = i === 0 || i === STRINGS.length - 1 ? 2 : 1;
      ctx.stroke();
    });

    // Draw frets
    for (let i = 0; i <= FRETS; i++) {
      const x = fretSpacing * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      
      // Выделяем нулевой лад (открытые струны)
      if (i === 0) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = i % 12 === 0 ? 2 : 1; // Выделяем 12-й лад
      }
      
      ctx.stroke();
    }
    
    // Добавляем маркеры для ладов (3, 5, 7, 9, 12)
    const fretMarkers = [3, 5, 7, 9, 12];
    fretMarkers.forEach(fret => {
      if (fret === 12) {
        // Двойной маркер для 12-го лада
        const x = fretSpacing * fret - fretSpacing / 2;
        const y1 = stringSpacing * 2;
        const y2 = stringSpacing * 4;
        
        ctx.beginPath();
        ctx.arc(x, y1, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#777';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y2, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#777';
        ctx.fill();
      } else {
        // Одиночный маркер для остальных ладов
        const x = fretSpacing * fret - fretSpacing / 2;
        const y = height / 2;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#777';
        ctx.fill();
      }
    });
  };

  const drawNotes = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const stringSpacing = height / (STRINGS.length + 1);
    const fretSpacing = width / (FRETS + 1);

    STRINGS.forEach((string, stringIndex) => {
      for (let fret = 0; fret <= FRETS; fret++) {
        const note = getNoteAtPosition(string, fret);
        const x = fretSpacing * fret + fretSpacing / 2;
        const y = stringSpacing * (stringIndex + 1);

        // Разный размер и стиль для открытых струн (нулевой лад)
        const radius = fret === 0 ? 12 : 10;
        const fillColor = fret === 0 ? '#e9e9e9' : '#fff';
        const strokeColor = fret === 0 ? '#000' : '#333';
        const fontColor = fret === 0 ? '#000' : '#333';
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = fret === 0 ? 2 : 1;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        ctx.fillStyle = fontColor;
        ctx.font = fret === 0 ? 'bold 10px Arial' : '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note, x, y);
      }
    });
  };

  const highlightNote = (ctx: CanvasRenderingContext2D, note: string, color: string = 'red') => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const stringSpacing = height / (STRINGS.length + 1);
    const fretSpacing = width / (FRETS + 1);

    // Убираем октаву из ноты для сравнения
    const noteWithoutOctave = note.replace(/\d+$/, '');

    STRINGS.forEach((string, stringIndex) => {
      for (let fret = 0; fret <= FRETS; fret++) {
        const fretNote = getNoteAtPosition(string, fret);
        if (fretNote === noteWithoutOctave) {
          const x = fretSpacing * fret + fretSpacing / 2;
          const y = stringSpacing * (stringIndex + 1);

          // Разный размер подсветки для открытых струн и обычных нот
          const radius = fret === 0 ? 17 : 15;
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.3;
          ctx.fill();
          
          // Добавляем контур для лучшей видимости
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
          
          ctx.globalAlpha = 1;
        }
      }
    });
  };

  const highlightScale = (ctx: CanvasRenderingContext2D, scale: { scale: any; root: string }) => {
    const rootIndex = NOTES.indexOf(scale.root);
    const intervals = scale.scale.intervals;
    
    intervals.forEach((interval: number) => {
      const note = NOTES[(rootIndex + interval) % 12];
      highlightNote(ctx, note, 'green');
    });
  };

  return (
    <div className="fretboard-container">
      <div className="fretboard-section">
        <h3>Played Notes</h3>
        <canvas 
          ref={fretboardRef} 
          width={canvasWidth}
          height={200}
          className="fretboard"
        />
      </div>
      
      <div className="fretboard-section">
        <h3>Related Scales</h3>
        <div className="scale-legend">
          {bestScale && relatedScales ? (
            <>
              <div 
                className={`legend-item ${selectedScale?.name === 'Main' ? 'selected' : ''}`}
                onClick={() => bestScale && handleScaleClick({ name: 'Main', root: bestScale.root, scale: bestScale.scale })}
              >
                <span className="color-dot green"></span>
                <span>{bestScale ? `${bestScale.root} ${bestScale.scale.name} (Main)` : 'No scale detected'}</span>
              </div>
              {relatedScales && relatedScales.map((scale, index) => (
                <div 
                  key={index} 
                  className={`legend-item ${selectedScale?.name === scale.name ? 'selected' : ''}`}
                  onClick={() => handleScaleClick(scale)}
                >
                  <span className={`color-dot ${['blue', 'purple', 'orange', 'pink', 'brown'][index]}`}></span>
                  <span>{scale.root} {scale.scale.name} ({scale.name})</span>
                </div>
              ))}
            </>
          ) : (
            <div className="legend-item">
              <span>Play notes to detect compatible scales</span>
            </div>
          )}
        </div>
        <canvas 
          ref={scaleboardRef} 
          width={canvasWidth}
          height={200}
          className="fretboard"
        />
      </div>
    </div>
  );
}; 