import PitchDetector from 'pitchfinder';

type PitchDetectorFunction = (buffer: Float32Array) => number | null;

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private detector: PitchDetectorFunction;
  private lastDetectedNote: string | null = null;
  private silenceThreshold: number = 0.04; // Повышаем порог тишины
  private minFrequency: number = 80; // Чуть больше, чтобы избежать шумов низких частот
  private maxFrequency: number = 800; // Сужаем диапазон для большей точности
  private recentFrequencies: number[] = []; // Буфер для сглаживания частот
  private frequencyBufferSize: number = 12; // Увеличиваем буфер для лучшего сглаживания
  private noteConfidence: Map<string, number> = new Map(); // Уверенность в определении ноты
  private confidenceThreshold: number = 8; // Повышаем порог уверенности для большей стабильности
  private ignoreConsecutiveDetections: number = 0; // Счетчик пропусков для стабилизации

  constructor() {
    // Настраиваем YIN алгоритм с более чувствительным порогом
    this.detector = PitchDetector.YIN({ threshold: 0.03 });
  }

  async startListening() {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; // Увеличили размер FFT для лучшего разрешения
      this.analyser.smoothingTimeConstant = 0.8; // Сглаживание для более стабильного анализа

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      this.processAudio();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stopListening() {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private isSilence(buffer: Float32Array): boolean {
    // Проверяем, является ли сигнал тишиной
    const rms = Math.sqrt(buffer.reduce((sum, x) => sum + x * x, 0) / buffer.length);
    return rms < this.silenceThreshold;
  }

  private isValidFrequency(frequency: number): boolean {
    return frequency >= this.minFrequency && frequency <= this.maxFrequency;
  }

  private smoothFrequency(frequency: number): number {
    // Добавляем новую частоту в буфер
    this.recentFrequencies.push(frequency);
    
    // Ограничиваем размер буфера
    if (this.recentFrequencies.length > this.frequencyBufferSize) {
      this.recentFrequencies.shift();
    }
    
    // Если у нас мало измерений, просто возвращаем текущую частоту
    if (this.recentFrequencies.length < 3) {
      return frequency;
    }
    
    // Медианная фильтрация - более устойчива к выбросам
    const sortedFrequencies = [...this.recentFrequencies].sort((a, b) => a - b);
    const median = sortedFrequencies[Math.floor(sortedFrequencies.length / 2)];
    
    // Взвешенное среднее - последние измерения имеют больший вес
    // Исключаем значения, которые отклоняются от медианы более чем на 15%
    const filteredFreqs = this.recentFrequencies.filter(
      f => Math.abs(f - median) / median < 0.15
    );
    
    if (filteredFreqs.length === 0) {
      return median; // Если все значения отфильтрованы, возвращаем медиану
    }
    
    // Вычисляем взвешенное среднее
    let sum = 0;
    let weightSum = 0;
    
    for (let i = 0; i < filteredFreqs.length; i++) {
      const weight = i + 1; // Более поздние измерения имеют больший вес
      sum += filteredFreqs[i] * weight;
      weightSum += weight;
    }
    
    return sum / weightSum;
  }

  private processAudio() {
    if (!this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // Если тишина, не обновляем ноту
    if (this.isSilence(buffer)) {
      requestAnimationFrame(() => this.processAudio());
      return;
    }

    const frequency = this.detector(buffer);
    
    if (frequency && this.isValidFrequency(frequency)) {
      const smoothedFrequency = this.smoothFrequency(frequency);
      
      // Иногда пропускаем обработку для стабилизации
      if (this.ignoreConsecutiveDetections > 0) {
        this.ignoreConsecutiveDetections--;
        requestAnimationFrame(() => this.processAudio());
        return;
      }
      
      // Проверяем, не слишком ли резко изменилась частота
      const lastFreq = this.recentFrequencies[this.recentFrequencies.length - 2];
      if (lastFreq && Math.abs(smoothedFrequency - lastFreq) / lastFreq > 0.1) {
        // Если частота изменилась более чем на 10%, временно игнорируем
        this.ignoreConsecutiveDetections = 3; // Пропустим 3 следующих детекции
        requestAnimationFrame(() => this.processAudio());
        return;
      }
      
      const note = this.frequencyToNote(smoothedFrequency);
      
      // Увеличиваем счетчик уверенности для этой ноты
      this.noteConfidence.set(note, (this.noteConfidence.get(note) || 0) + 1);
      
      // Если нота изменилась, сбрасываем уверенность для предыдущей ноты
      if (this.lastDetectedNote && this.lastDetectedNote !== note) {
        this.noteConfidence.set(this.lastDetectedNote, Math.max(0, (this.noteConfidence.get(this.lastDetectedNote) || 0) - 2));
      }
      
      // Если уверенность достигла порога, обновляем ноту
      if ((this.noteConfidence.get(note) || 0) >= this.confidenceThreshold) {
        // Проверяем, что частота стабильна по последним N измерениям
        const frequencies = this.recentFrequencies.slice(-5);
        const isStable = frequencies.length === 5 && 
          frequencies.every(f => Math.abs(f - frequencies[0]) / frequencies[0] < 0.05);
        
        if (isStable && note !== this.lastDetectedNote) {
          console.log(`Detected note: ${note} (${smoothedFrequency.toFixed(2)} Hz)`);
          this.lastDetectedNote = note;
          window.dispatchEvent(new CustomEvent('noteDetected', { 
            detail: { 
              note,
              frequency: smoothedFrequency
            } 
          }));
          
          // После отправки события, устанавливаем счетчик пропусков
          this.ignoreConsecutiveDetections = 5;
        }
      }
    }

    requestAnimationFrame(() => this.processAudio());
  }

  private frequencyToNote(frequency: number): string {
    // A4 = 440 Hz стандарт
    const A4 = 440;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Специальные проверки для часто используемых нот
    // Подстраиваем границы, исправляя смещение на 1 лад
    const frequencyRanges = {
      // Ноты 4-й октавы с коррекцией
      'E4': [322, 337], // E4 - примерно 329.63 Hz
      'F4': [343, 356], // F4 - примерно 349.23 Hz
      'F#4': [363, 377], // F#4 - примерно 369.99 Hz
      'G4': [386, 402], // G4 - примерно 392.00 Hz
      'G#4': [409, 425], // G#4 - примерно 415.30 Hz
      'A4': [432, 448], // A4 - 440.00 Hz
      
      // Гитарные струны (стандартный строй)
      'E2': [78, 86], // E2 - 6 струна (примерно 82.41 Hz)
      'A2': [106, 114], // A2 - 5 струна (примерно 110 Hz) 
      'D3': [143, 151], // D3 - 4 струна (примерно 146.83 Hz)
      'G3': [192, 201], // G3 - 3 струна (примерно 196 Hz)
      'B3': [243, 251], // B3 - 2 струна (примерно 246.94 Hz)
    };
    
    // Проверяем, не попадает ли частота в заданные диапазоны
    for (const [note, [min, max]] of Object.entries(frequencyRanges)) {
      if (frequency >= min && frequency <= max) {
        return note; // Если попадает, сразу возвращаем соответствующую ноту
      }
    }
    
    // Стандартные частоты для нот (A4 = 440 Hz)
    const standardFrequencies: Record<string, number> = {
      'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60, 'F0': 21.83, 'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
      'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
      'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
      'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
      'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
      'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
      'C6': 1046.50
    };
    
    // Находим две ближайшие ноты
    let closestNote = '';
    let minDifference = Infinity;
    
    for (const [note, noteFreq] of Object.entries(standardFrequencies)) {
      const difference = Math.abs(frequency - noteFreq);
      
      // Корректируем определение для F4-G#4 диапазона (исправляем смещение)
      if (frequency > 340 && frequency < 425) {
        if (note === 'F4' && frequency < 356) {
          return 'F4';
        } else if (note === 'F#4' && frequency >= 356 && frequency < 377) {
          return 'F#4';
        } else if (note === 'G4' && frequency >= 377 && frequency < 402) {
          return 'G4';
        } else if (note === 'G#4' && frequency >= 402 && frequency < 425) {
          return 'G#4';
        }
      }
      
      if (difference < minDifference) {
        minDifference = difference;
        closestNote = note;
      }
    }
    
    return closestNote;
  }
} 