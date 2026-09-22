import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Volume2,
  VolumeX,
  Radio,
  Settings2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  X,
  CheckCircle2,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { TimelineTrack } from '../types';

export interface VoiceoverSavePayload {
  blob: Blob;
  audioUrl: string;
  duration: number;
  name: string;
  targetTrackId?: string;
  insertTime: number;
  createNewTrack: boolean;
}

interface LiveVoiceoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  duration: number;
  availableTracks: TimelineTrack[];
  defaultTargetTrackId?: string;
  onSaveVoiceover: (payload: VoiceoverSavePayload) => void;
  onStartSyncPlayback?: (startTime: number) => void;
  onPauseSyncPlayback?: () => void;
  onResumeSyncPlayback?: () => void;
  onStopSyncPlayback?: () => void;
}

type RecordState = 'idle' | 'countdown' | 'recording' | 'paused' | 'review';
type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export const LiveVoiceoverModal: React.FC<LiveVoiceoverModalProps> = ({
  isOpen,
  onClose,
  currentTime,
  duration: totalTimelineDuration,
  availableTracks,
  defaultTargetTrackId,
  onSaveVoiceover,
  onStartSyncPlayback,
  onPauseSyncPlayback,
  onResumeSyncPlayback,
  onStopSyncPlayback,
}) => {
  // --- Permissions & Devices ---
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('prompt');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio settings
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [autoGainControl, setAutoGainControl] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Recording lifecycle
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [useCountdown, setUseCountdown] = useState<boolean>(true);
  const [syncTimelinePlayback, setSyncTimelinePlayback] = useState<boolean>(true);

  // Timer & Duration
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(currentTime);

  // Recorded Artifacts
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [clipName, setClipName] = useState<string>('');
  const [selectedTrackOption, setSelectedTrackOption] = useState<string>(
    defaultTargetTrackId || '__new_track__'
  );
  const [insertAtPlayhead, setInsertAtPlayhead] = useState<boolean>(true);

  // Audio Preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);

  // Input audio level (VU meter 0 - 100)
  const [inputLevel, setInputLevel] = useState<number>(0);

  // References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Filter audio tracks from timeline
  const audioTracks = availableTracks.filter((t) => t.type === 'audio');

  // -------------------------------------------------------------
  // Stop & Cleanup Streams and Contexts
  // -------------------------------------------------------------
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping mediaRecorder:', err);
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (err) {
        console.warn('Error closing audioContext:', err);
      }
      audioContextRef.current = null;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------
  // Initialize Mic Stream & Analyser
  // -------------------------------------------------------------
  const initMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('unsupported');
      setErrorMessage('MediaDevices API is not supported in this browser environment.');
      return;
    }

    setErrorMessage(null);

    try {
      // Release previous stream if any
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl,
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setPermissionStatus('granted');

      // Enumerate audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      setAudioDevices(audioInputs);
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }

      // Initialize Web Audio API Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start Visualizer Loop
      startVisualizer();
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setErrorMessage(
          'Microphone permission was denied. Please allow microphone access in your browser site settings.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionStatus('unsupported');
        setErrorMessage('No microphone device was found. Please plug in a microphone and retry.');
      } else {
        setPermissionStatus('denied');
        setErrorMessage(`Microphone access error: ${err.message || 'Unknown error'}`);
      }
    }
  }, [selectedDeviceId, echoCancellation, noiseSuppression, autoGainControl]);

  // -------------------------------------------------------------
  // Real-time Canvas Waveform & VU Meter Animation Loop
  // -------------------------------------------------------------
  const startVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Calculate instantaneous RMS / average level for VU meter
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
      setInputLevel(normalizedLevel);

      // Draw canvas
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.fillStyle = 'rgba(6, 9, 20, 0.4)';
      ctx.fillRect(0, 0, width, height);

      // Draw frequency visualizer bars
      const barWidth = (width / bufferLength) * 2.2;
      let barX = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (height - 8);

        // Dynamic gradient based on state
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        if (recordState === 'recording') {
          gradient.addColorStop(0, 'rgba(244, 63, 94, 0.3)');
          gradient.addColorStop(0.5, 'rgba(244, 63, 94, 0.8)');
          gradient.addColorStop(1, '#ff4b72');
        } else if (recordState === 'paused') {
          gradient.addColorStop(0, 'rgba(234, 179, 8, 0.2)');
          gradient.addColorStop(1, 'rgba(234, 179, 8, 0.8)');
        } else {
          gradient.addColorStop(0, 'rgba(47, 217, 244, 0.2)');
          gradient.addColorStop(0.7, 'rgba(196, 192, 255, 0.8)');
          gradient.addColorStop(1, '#2fd9f4');
        }

        ctx.fillStyle = gradient;
        ctx.shadowBlur = recordState === 'recording' ? 8 : 4;
        ctx.shadowColor = recordState === 'recording' ? '#f43f5e' : '#2fd9f4';

        // Rounded top bars
        const y = height - barHeight;
        ctx.fillRect(barX, y, barWidth - 1, barHeight);

        barX += barWidth;
      }
      ctx.shadowBlur = 0;
    };

    draw();
  }, [recordState]);

  // When modal opens/closes or device settings change
  useEffect(() => {
    if (isOpen) {
      setRecordState('idle');
      setRecordedBlob(null);
      setRecordedAudioUrl(null);
      setRecordedDuration(0);
      setElapsedTime(0);
      setRecordingStartTime(currentTime);
      setClipName(`🎙️ Voiceover (${formatTime(currentTime)})`);
      setSelectedTrackOption(defaultTargetTrackId || (audioTracks.length > 0 ? audioTracks[0].id : '__new_track__'));
      initMicrophone();
    } else {
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [isOpen]);

  // Restart microphone when audio constraint settings or device changes
  useEffect(() => {
    if (isOpen && permissionStatus === 'granted' && recordState === 'idle') {
      initMicrophone();
    }
  }, [selectedDeviceId, echoCancellation, noiseSuppression, autoGainControl]);

  // -------------------------------------------------------------
  // Countdown and Start Recording
  // -------------------------------------------------------------
  const handleStartRecordingFlow = () => {
    if (permissionStatus !== 'granted') {
      initMicrophone();
      return;
    }

    const startPos = insertAtPlayhead ? currentTime : 0;
    setRecordingStartTime(startPos);
    setClipName(`🎙️ Voiceover (${formatTime(startPos)})`);

    if (useCountdown) {
      setRecordState('countdown');
      setCountdown(3);

      let count = 3;
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          actuallyStartRecording(startPos);
        } else {
          setCountdown(count);
        }
      }, 1000);
    } else {
      actuallyStartRecording(startPos);
    }
  };

  const actuallyStartRecording = (startPos: number) => {
    if (!mediaStreamRef.current) return;

    audioChunksRef.current = [];

    // Determine supported MIME type
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else {
        mimeType = '';
      }
    }

    try {
      const recorder = new MediaRecorder(
        mediaStreamRef.current,
        mimeType ? { mimeType } : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlob(audioBlob);
        setRecordedAudioUrl(url);
        setRecordState('review');
      };

      recorder.start(100); // collect in 100ms slices
      mediaRecorderRef.current = recorder;

      setRecordState('recording');
      recordStartTimeRef.current = performance.now();
      pausedTimeRef.current = 0;
      setElapsedTime(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        const now = performance.now();
        const durationSec = (now - recordStartTimeRef.current) / 1000;
        setElapsedTime(durationSec);
      }, 50);

      // Optional Synchronized Timeline Playback
      if (syncTimelinePlayback && onStartSyncPlayback) {
        onStartSyncPlayback(startPos);
      }
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setErrorMessage(`Failed to start recording: ${err.message || 'Unknown error'}`);
      setRecordState('idle');
    }
  };

  // -------------------------------------------------------------
  // Pause & Resume Recording
  // -------------------------------------------------------------
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordState('paused');

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (syncTimelinePlayback && onPauseSyncPlayback) {
        onPauseSyncPlayback();
      }
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordState('recording');

      // Adjust start time to account for pause duration
      const resumeTime = performance.now();
      recordStartTimeRef.current = resumeTime - elapsedTime * 1000;

      timerIntervalRef.current = setInterval(() => {
        const now = performance.now();
        const durationSec = (now - recordStartTimeRef.current) / 1000;
        setElapsedTime(durationSec);
      }, 50);

      if (syncTimelinePlayback && onResumeSyncPlayback) {
        onResumeSyncPlayback();
      }
    }
  };

  // -------------------------------------------------------------
  // Stop Recording
  // -------------------------------------------------------------
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setRecordedDuration(elapsedTime);

    if (syncTimelinePlayback && onStopSyncPlayback) {
      onStopSyncPlayback();
    }
  };

  // -------------------------------------------------------------
  // Discard & Re-record
  // -------------------------------------------------------------
  const handleDiscard = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setRecordState('idle');
    setElapsedTime(0);
    setRecordedDuration(0);
    setIsPreviewPlaying(false);
  };

  // -------------------------------------------------------------
  // Audio Preview Controls
  // -------------------------------------------------------------
  const handleTogglePreviewAudio = () => {
    if (!previewAudioRef.current && recordedAudioUrl) {
      const audio = new Audio(recordedAudioUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
      };
    }

    if (previewAudioRef.current) {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
        previewAudioRef.current.play().catch((err) => console.warn('Preview play error:', err));
        setIsPreviewPlaying(true);
      }
    }
  };

  // -------------------------------------------------------------
  // Save & Add to Timeline
  // -------------------------------------------------------------
  const handleAddToTimeline = () => {
    if (!recordedBlob || !recordedAudioUrl) return;

    const isNew = selectedTrackOption === '__new_track__';
    const targetTrackId = isNew ? undefined : selectedTrackOption;
    const finalDuration = Math.max(0.2, recordedDuration || elapsedTime);

    onSaveVoiceover({
      blob: recordedBlob,
      audioUrl: recordedAudioUrl,
      duration: finalDuration,
      name: clipName.trim() || `🎙️ Voiceover (${formatTime(recordingStartTime)})`,
      targetTrackId,
      insertTime: recordingStartTime,
      createNewTrack: isNew,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-xl p-6 relative border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col gap-4 bg-[#080c18]/95 backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#dee1f9] flex items-center gap-2">
                Live Voiceover Recording
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  MediaRecorder
                </span>
              </h3>
              <p className="text-xs text-[#c7c4d8]">
                Record studio-quality voiceover commentary directly to your timeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-2 rounded-lg text-xs font-semibold transition-all ${
                showSettings
                  ? 'bg-white/15 text-white'
                  : 'text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5'
              }`}
              title="Microphone & Audio Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#c7c4d8] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner / Permissions Notice */}
        {permissionStatus === 'denied' && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Microphone Access Blocked</p>
              <p className="mt-0.5 text-red-200/80">
                {errorMessage ||
                  'Please click the lock/settings icon in your browser address bar and enable microphone access for this app.'}
              </p>
              <button
                onClick={initMicrophone}
                className="mt-2 px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-100 font-semibold transition-colors"
              >
                Retry Permission Request
              </button>
            </div>
          </div>
        )}

        {/* Audio Device & Processing Settings Dropdown Panel */}
        {showSettings && (
          <div className="p-3.5 rounded-xl bg-[#0e1323] border border-white/10 flex flex-col gap-3 text-xs animate-fadeIn">
            <div className="flex items-center justify-between font-semibold text-[#c4c0ff]">
              <span>Audio Input Device:</span>
              <button
                onClick={initMicrophone}
                className="text-[11px] text-[#2fd9f4] hover:underline"
              >
                Refresh Devices
              </button>
            </div>

            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-[#080c18] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2fd9f4]"
            >
              {audioDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
              {audioDevices.length === 0 && <option value="">Default Microphone</option>}
            </select>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#c7c4d8] hover:text-white">
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  className="rounded bg-[#080c18] border-white/20 text-[#2fd9f4]"
                />
                Noise Suppress
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[#c7c4d8] hover:text-white">
                <input
                  type="checkbox"
                  checked={echoCancellation}
                  onChange={(e) => setEchoCancellation(e.target.checked)}
                  className="rounded bg-[#080c18] border-white/20 text-[#2fd9f4]"
                />
                Echo Cancel
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[#c7c4d8] hover:text-white">
                <input
                  type="checkbox"
                  checked={autoGainControl}
                  onChange={(e) => setAutoGainControl(e.target.checked)}
                  className="rounded bg-[#080c18] border-white/20 text-[#2fd9f4]"
                />
                Auto Gain
              </label>
            </div>
          </div>
        )}

        {/* Live Audio Visualizer & Waveform Canvas */}
        <div className="relative w-full h-32 rounded-xl overflow-hidden bg-[#060812] border border-white/10 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={520}
            height={128}
            className="w-full h-full object-cover"
          />

          {/* Overlay Status Badge */}
          <div className="absolute top-2.5 left-3 flex items-center gap-2">
            {recordState === 'recording' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm backdrop-blur-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                REC LIVE
              </span>
            )}
            {recordState === 'paused' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 backdrop-blur-sm">
                PAUSED
              </span>
            )}
            {recordState === 'idle' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 backdrop-blur-sm">
                <Radio className="w-3 h-3 text-[#2fd9f4]" />
                Mic Standby
              </span>
            )}
            {recordState === 'review' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Capture Complete
              </span>
            )}
          </div>

          {/* Time Counter Overlay */}
          <div className="absolute top-2.5 right-3 font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#080c18]/90 text-[#dee1f9] border border-white/10">
            {recordState === 'review'
              ? formatTime(recordedDuration)
              : formatTime(elapsedTime)}
          </div>

          {/* Countdown Center Overlay */}
          {recordState === 'countdown' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn">
              <span className="text-5xl font-black text-[#2fd9f4] font-mono scale-125 animate-ping">
                {countdown}
              </span>
              <span className="text-xs text-cyan-200 mt-2 font-semibold">
                Get ready to speak...
              </span>
            </div>
          )}
        </div>

        {/* Real-time Level VU Meter Bar */}
        <div className="flex items-center gap-2 text-xs">
          <Volume2 className="w-3.5 h-3.5 text-[#c7c4d8] flex-shrink-0" />
          <div className="flex-1 h-2 rounded-full bg-[#080c18] border border-white/10 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                inputLevel > 80
                  ? 'bg-gradient-to-r from-[#2fd9f4] via-yellow-400 to-rose-500'
                  : inputLevel > 40
                  ? 'bg-gradient-to-r from-[#2fd9f4] to-cyan-300'
                  : 'bg-[#2fd9f4]/60'
              }`}
              style={{ width: `${Math.max(2, inputLevel)}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-[#c7c4d8] w-8 text-right">
            {inputLevel}%
          </span>
        </div>

        {/* Dynamic Controls based on Record State */}
        {recordState === 'idle' && (
          <div className="flex flex-col gap-3">
            {/* Recording Options */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#0e1323] border border-white/5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#dee1f9]">
                <input
                  type="checkbox"
                  checked={useCountdown}
                  onChange={(e) => setUseCountdown(e.target.checked)}
                  className="rounded bg-[#080c18] border-white/20 text-[#2fd9f4]"
                />
                <span>3s Prep Countdown</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#dee1f9]">
                <input
                  type="checkbox"
                  checked={syncTimelinePlayback}
                  onChange={(e) => setSyncTimelinePlayback(e.target.checked)}
                  className="rounded bg-[#080c18] border-white/20 text-[#2fd9f4]"
                />
                <span>Sync Video Playback while recording</span>
              </label>
            </div>

            {/* Start Record Button */}
            <button
              onClick={handleStartRecordingFlow}
              disabled={permissionStatus === 'denied'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
              <span>Start Recording Voiceover</span>
            </button>
          </div>
        )}

        {(recordState === 'recording' || recordState === 'paused') && (
          <div className="flex items-center gap-3">
            {recordState === 'recording' ? (
              <button
                onClick={handlePauseRecording}
                className="flex-1 py-3 rounded-xl glass-panel bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-300 font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleResumeRecording}
                className="flex-1 py-3 rounded-xl glass-panel bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
            )}

            <button
              onClick={handleStopRecording}
              className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Save</span>
            </button>
          </div>
        )}

        {/* Post-Recording Review & Configuration Section */}
        {recordState === 'review' && (
          <div className="flex flex-col gap-3.5 p-4 rounded-xl bg-[#0e1323] border border-white/10 text-xs animate-fadeIn">
            {/* Audio Preview Controls */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#080c18] border border-white/5">
              <button
                onClick={handleTogglePreviewAudio}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2fd9f4]/15 border border-[#2fd9f4]/30 text-[#2fd9f4] font-semibold hover:bg-[#2fd9f4]/25 transition-colors"
              >
                {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPreviewPlaying ? 'Pause Review' : 'Listen Preview'}</span>
              </button>

              <span className="font-mono text-xs text-[#c4c0ff]">
                Duration: {formatTime(recordedDuration)}
              </span>
            </div>

            {/* Clip Name */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-medium">Voiceover Clip Label:</label>
              <input
                type="text"
                value={clipName}
                onChange={(e) => setClipName(e.target.value)}
                className="bg-[#080c18] border border-white/15 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-[#2fd9f4]"
                placeholder="e.g. Intro Voiceover"
              />
            </div>

            {/* Target Track Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Target Timeline Track:
                </label>
                <select
                  value={selectedTrackOption}
                  onChange={(e) => setSelectedTrackOption(e.target.value)}
                  className="bg-[#080c18] border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-[#2fd9f4]"
                >
                  <option value="__new_track__">✨ + Dedicated Voiceover Track</option>
                  {audioTracks.map((trk) => (
                    <option key={trk.id} value={trk.id}>
                      🎵 {trk.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Position Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#2fd9f4]" />
                  Timeline Insert Time:
                </label>
                <div className="flex items-center gap-2 bg-[#080c18] border border-white/15 rounded-lg px-2.5 py-1.5 text-white">
                  <span className="font-mono font-bold text-[#2fd9f4]">
                    {formatTime(recordingStartTime)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({recordingStartTime === 0 ? 'Start' : 'Playhead'})
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
              <button
                onClick={handleDiscard}
                className="px-4 py-2.5 rounded-xl glass-panel border border-white/10 text-[#c7c4d8] hover:text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition-colors font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record</span>
              </button>

              <button
                onClick={handleAddToTimeline}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-[#2fd9f4] hover:from-purple-600 hover:to-[#22c7e0] text-black font-bold flex items-center justify-center gap-2 shadow-aura-glow transition-all active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>Insert to Timeline</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
