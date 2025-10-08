import { PitchDetector } from 'pitchy';

export class PitchyProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private detector: PitchDetector<Float32Array> | null = null;
  private lastDetectedNote: string | null = null;
  private silenceThreshold: number = 0.03;
  private minFrequency: number = 80;
  private maxFrequency: number = 900;
  private recentClarities: number[] = [];
  private claritiesBufferSize: number = 5;
  private minClarity: number = 0.8; // Минимальная четкость для определения ноты
  private noteConfidence: Map<string, number> = new Map();
  private confidenceThreshold: number = 3;
  private isProcessing: boolean = false;
  private currentStream: MediaStream | null = null;
  private currentDeviceId: string | null = null;

  constructor() {
    // Будем создавать детектор при старте, так как нужен размер окна
  }

  async startListening(deviceId?: string) {
    try {
      // If changing device, stop existing first
      if (this.currentStream) {
        this.stopListening();
      }

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId ? { deviceId: { exact: deviceId } as any } : {})
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.currentDeviceId = deviceId || null;

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Создаем детектор тональности с размером окна
      this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);

      // Запускаем обработку звука
      this.isProcessing = true;
      this.processAudio();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stopListening() {
    this.isProcessing = false;
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  async switchDevice(deviceId: string | null) {
    // If same device, do nothing
    if (this.currentDeviceId === (deviceId || null)) return;
    this.stopListening();
    await this.startListening(deviceId || undefined);
  }

  private isSilence(buffer: Float32Array): boolean {
    // Проверяем, является ли сигнал тишиной
    const rms = Math.sqrt(buffer.reduce((sum, x) => sum + x * x, 0) / buffer.length);
    return rms < this.silenceThreshold;
  }

  private isValidFrequency(frequency: number): boolean {
    return frequency >= this.minFrequency && frequency <= this.maxFrequency;
  }

  private addClarity(clarity: number): number {
    // Добавляем новую четкость в буфер
    this.recentClarities.push(clarity);
    
    // Ограничиваем размер буфера
    if (this.recentClarities.length > this.claritiesBufferSize) {
      this.recentClarities.shift();
    }
    
    // Вычисляем среднюю четкость
    const sum = this.recentClarities.reduce((acc, val) => acc + val, 0);
    return sum / this.recentClarities.length;
  }

  private processAudio() {
    if (!this.isProcessing || !this.analyser || !this.detector) {
      return;
    }

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // Если тишина, не обновляем ноту
    if (this.isSilence(buffer)) {
      requestAnimationFrame(() => this.processAudio());
      return;
    }

    // Используем Pitchy для определения частоты и четкости (clarity)
    const [pitch, clarity] = this.detector.findPitch(buffer, this.audioContext!.sampleRate);
    
    // Проверяем четкость сигнала
    const avgClarity = this.addClarity(clarity);
    
    if (pitch && this.isValidFrequency(pitch) && avgClarity > this.minClarity) {
      const note = this.frequencyToNote(pitch);
      
      // Увеличиваем счетчик уверенности для этой ноты
      this.noteConfidence.set(note, (this.noteConfidence.get(note) || 0) + 1);
      
      // Если нота изменилась, сбрасываем уверенность для предыдущей ноты
      if (this.lastDetectedNote && this.lastDetectedNote !== note) {
        this.noteConfidence.set(this.lastDetectedNote, 0);
      }
      
      // Если уверенность достигла порога, обновляем ноту
      if ((this.noteConfidence.get(note) || 0) >= this.confidenceThreshold) {
        if (note !== this.lastDetectedNote) {
          console.log(`Detected note: ${note} (${pitch.toFixed(2)} Hz) with clarity: ${clarity.toFixed(2)}`);
          this.lastDetectedNote = note;
          window.dispatchEvent(new CustomEvent('noteDetected', { 
            detail: { 
              note,
              frequency: pitch,
              clarity: avgClarity
            } 
          }));
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
    const frequencyRanges = {
      // Ноты 4-й октавы
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
    
    // Вычисляем ноту более точно используя логарифмическую формулу
    const semitonesFromA4 = 12 * Math.log2(frequency / A4);
    const roundedSemitones = Math.round(semitonesFromA4);
    
    // Вычисляем октаву и индекс ноты
    const octave = 4 + Math.floor((roundedSemitones + 9) / 12);
    const noteIndex = (roundedSemitones + 9) % 12;
    
    if (noteIndex < 0) {
      return noteNames[noteIndex + 12] + (octave - 1);
    }
    
    return noteNames[noteIndex] + octave;
  }
} 