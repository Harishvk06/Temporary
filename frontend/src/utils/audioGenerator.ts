/**
 * Programmatically generates a futuristic ambient soundscape with floating and echoing effects,
 * perfectly synchronized with anti-gravity visuals using Web Audio API OfflineAudioContext.
 */
export function generateFuturisticSoundscape(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const sampleRate = 44100;
      const durationSeconds = 12;
      const numberOfChannels = 2;
      const lengthSamples = sampleRate * durationSeconds;

      const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
        numberOfChannels,
        lengthSamples,
        sampleRate
      );

      // 1. Deep Sub-Gravity Drone (108Hz Sine + Slow LFO Tremolo)
      const droneOsc = offlineCtx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(108, 0);
      droneOsc.frequency.exponentialRampToValueAtTime(54, durationSeconds);

      const droneGain = offlineCtx.createGain();
      droneGain.gain.setValueAtTime(0.3, 0);
      droneGain.gain.linearRampToValueAtTime(0.5, durationSeconds / 2);
      droneGain.gain.linearRampToValueAtTime(0.01, durationSeconds);

      droneOsc.connect(droneGain);
      droneGain.connect(offlineCtx.destination);

      // 2. Floating Ambient Synth Pad (Sawtooth + Low-Pass Filter Sweep)
      const padOsc = offlineCtx.createOscillator();
      padOsc.type = 'sawtooth';
      padOsc.frequency.setValueAtTime(216, 0);
      padOsc.frequency.linearRampToValueAtTime(432, durationSeconds / 2);
      padOsc.frequency.linearRampToValueAtTime(216, durationSeconds);

      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, 0);
      filter.frequency.exponentialRampToValueAtTime(2400, durationSeconds / 2);
      filter.frequency.exponentialRampToValueAtTime(400, durationSeconds);
      filter.Q.setValueAtTime(8, 0);

      // 3. Echoing Delay Effect (Feedback Loop)
      const delayNode = offlineCtx.createDelay();
      delayNode.delayTime.setValueAtTime(0.375, 0); // 3/8th note floating delay

      const feedbackGain = offlineCtx.createGain();
      feedbackGain.gain.setValueAtTime(0.55, 0);

      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);

      const padGain = offlineCtx.createGain();
      padGain.gain.setValueAtTime(0.01, 0);
      padGain.gain.linearRampToValueAtTime(0.25, 2);
      padGain.gain.linearRampToValueAtTime(0.25, durationSeconds - 2);
      padGain.gain.linearRampToValueAtTime(0.01, durationSeconds);

      padOsc.connect(filter);
      filter.connect(padGain);
      padGain.connect(offlineCtx.destination);
      padGain.connect(delayNode);
      delayNode.connect(offlineCtx.destination);

      // 4. Anti-Gravity Resonance Chimes (Frequency Swarm)
      const chimeFreqs = [528, 639, 741, 852, 963];
      chimeFreqs.forEach((freq, idx) => {
        const chimeOsc = offlineCtx.createOscillator();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, 0);

        const chimeGain = offlineCtx.createGain();
        const startTime = 1.5 + idx * 1.8;
        chimeGain.gain.setValueAtTime(0, 0);
        chimeGain.gain.setValueAtTime(0.12, startTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 3.0);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(delayNode);
        chimeGain.connect(offlineCtx.destination);

        chimeOsc.start(startTime);
        chimeOsc.stop(startTime + 3.5);
      });

      // Start Oscillators
      droneOsc.start(0);
      droneOsc.stop(durationSeconds);
      padOsc.start(0);
      padOsc.stop(durationSeconds);

      // Render Audio Buffer to PCM WAV
      offlineCtx.startRendering().then((renderedBuffer) => {
        const wavDataUrl = audioBufferToWavDataUrl(renderedBuffer);
        resolve(wavDataUrl);
      }).catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Converts a Web Audio API AudioBuffer into a Data URL formatted WAV file
 */
function audioBufferToWavDataUrl(buffer: AudioBuffer): string {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');

  // fmt sub-chunk
  writeString('fmt ');
  setUint32(16); // SubChunk1Size (16 for PCM)
  setUint16(1); // AudioFormat (1 for PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // ByteRate
  setUint16(numOfChan * 2); // BlockAlign
  setUint16(16); // BitsPerSample

  // data sub-chunk
  writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  const blob = new Blob([outBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
