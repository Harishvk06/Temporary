import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Music, Upload, Play, Pause, Check, Search, Sparkles, Volume2, Wand2, Mic } from 'lucide-react';
import { readFileAsDataURL } from '../utils/fileHelpers';
import { generateFuturisticSoundscape } from '../utils/audioGenerator';

export interface AudioPreset {
  id: string;
  title: string;
  genre: string;
  duration: string;
  url: string;
}

export const SAMPLE_AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'preset_futuristic_ambient',
    title: 'Futuristic Anti-Gravity Soundscape',
    genre: 'Ambient / Sci-Fi Synth',
    duration: '0:12',
    url: '', // Dynamically generated
  },
  {
    id: 'preset_1',
    title: 'Cinematic Sunset Score',
    genre: 'Cinematic / Orchestral',
    duration: '0:30',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cinematic-time-lapse-115672.mp3',
  },
  {
    id: 'preset_2',
    title: 'Upbeat Future Bass',
    genre: 'Electronic / Dance',
    duration: '0:25',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73708.mp3?filename=upbeat-energetic-pop-10284.mp3',
  },
  {
    id: 'preset_3',
    title: 'Lo-Fi Chill Beats',
    genre: 'Lo-Fi / Hip-Hop',
    duration: '0:30',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: 'preset_4',
    title: 'Acoustic Guitar Breeze',
    genre: 'Acoustic / Folk',
    duration: '0:28',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_9ec5efee69.mp3?filename=inspiring-acoustic-12108.mp3',
  },
  {
    id: 'preset_5',
    title: 'Dramatic Action Drums',
    genre: 'Trailer / Percussion',
    duration: '0:20',
    url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=dramatic-atmosphere-119641.mp3',
  },
];

interface AudioSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTrackName?: string;
  onSelectAudio: (title: string, audioUrl: string) => void;
  onOpenLiveVoiceover?: () => void;
}

export const AudioSelectorModal: React.FC<AudioSelectorModalProps> = ({
  isOpen,
  onClose,
  targetTrackName = 'Audio Track',
  onSelectAudio,
  onOpenLiveVoiceover,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTogglePreview = async (preset: AudioPreset) => {
    if (playingPresetId === preset.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingPresetId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      let targetUrl = preset.url;
      if (preset.id === 'preset_futuristic_ambient' && !targetUrl) {
        setIsGenerating(true);
        try {
          targetUrl = await generateFuturisticSoundscape();
          preset.url = targetUrl;
        } catch (err) {
          console.error('Failed soundscape generation:', err);
        } finally {
          setIsGenerating(false);
        }
      }

      if (!targetUrl) return;

      const audio = new Audio(targetUrl);
      audioRef.current = audio;
      audio.play().catch((err) => console.warn('Preview playback failed:', err));
      audio.onended = () => setPlayingPresetId(null);
      setPlayingPresetId(preset.id);
    }
  };

  const handleStopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingPresetId(null);
  };

  const handleClose = () => {
    handleStopPreview();
    onClose();
  };

  const handleSelectPreset = async (preset: AudioPreset) => {
    handleStopPreview();
    let targetUrl = preset.url;
    if (preset.id === 'preset_futuristic_ambient' && !targetUrl) {
      setIsGenerating(true);
      try {
        targetUrl = await generateFuturisticSoundscape();
      } catch (err) {
        console.error('Failed soundscape generation:', err);
      } finally {
        setIsGenerating(false);
      }
    }

    if (targetUrl) {
      onSelectAudio(preset.title, targetUrl);
      onClose();
    }
  };

  const handleGenerateFuturisticSoundscape = async () => {
    setIsGenerating(true);
    handleStopPreview();
    try {
      const soundscapeDataUrl = await generateFuturisticSoundscape();
      onSelectAudio('Futuristic Anti-Gravity Soundscape', soundscapeDataUrl);
      onClose();
    } catch (err) {
      console.error('Soundscape generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataURL(file);
      handleStopPreview();
      onSelectAudio(file.name, dataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to read audio file:', err);
    }
    e.target.value = '';
  };

  const filteredPresets = SAMPLE_AUDIO_PRESETS.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Select or Upload Audio for '${targetTrackName}'`}>
      <div className="flex flex-col gap-5 text-[#c7c4d8]">
        {/* Upload Custom Audio File Section */}
        <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 shadow-aura-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#dee1f9]">Upload Custom Audio File</h4>
              <p className="text-xs text-[#c7c4d8]/80">Import MP3, WAV, AAC, M4A or OGG from your computer</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="gradient-btn px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap shadow-aura-glow hover:scale-105 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4 text-[#080c18]" />
            Choose Audio File
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Live Voiceover Recording Studio Banner */}
        {onOpenLiveVoiceover && (
          <div className="glass-panel p-4 rounded-xl border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-purple-500/15 shadow-aura-glow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Live Voiceover Recording
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/40 font-mono">
                    Microphone Studio
                  </span>
                </h4>
                <p className="text-xs text-[#c7c4d8]">
                  Record your voice in real time with interactive waveform visualizer and synced video playback.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenLiveVoiceover();
              }}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white flex items-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              <Mic className="w-4 h-4" />
              Open Voiceover Studio
            </button>
          </div>
        )}

        {/* Royalty-Free Preset Library Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2fd9f4]" />
              <h4 className="text-sm font-bold text-[#dee1f9]">Royalty-Free Audio Library</h4>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c4d8]/60" />
              <input
                type="text"
                placeholder="Search music & FX..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#080c18] border border-white/10 rounded-full pl-8 pr-3 py-1 text-xs text-[#dee1f9] focus:outline-none focus:border-[#2fd9f4] w-48"
              />
            </div>
          </div>

          {/* Presets List */}
          <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
            {filteredPresets.map((preset) => {
              const isPlaying = playingPresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  className={`glass-panel p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isPlaying
                      ? 'border-[#2fd9f4] bg-[#2fd9f4]/10 shadow-aura-glow'
                      : 'border-white/5 hover:border-purple-400/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTogglePreview(preset)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-[#2fd9f4] text-[#080c18] shadow-aura-glow scale-105'
                          : 'bg-white/10 text-white hover:bg-purple-500/20 hover:text-purple-300'
                      }`}
                      title={isPlaying ? 'Pause preview' : 'Play audio preview'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dee1f9] flex items-center gap-1.5">
                        {preset.title}
                        {isPlaying && <Volume2 className="w-3 h-3 text-[#2fd9f4] animate-pulse" />}
                      </span>
                      <span className="text-[11px] text-[#c7c4d8]/70 font-mono">
                        {preset.genre} • {preset.duration}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPreset(preset)}
                    className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2fd9f4] border border-[#2fd9f4]/30 hover:bg-[#2fd9f4]/20 flex items-center gap-1 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Assign to Track
                  </button>
                </div>
              );
            })}

            {filteredPresets.length === 0 && (
              <div className="text-center py-6 text-xs text-[#c7c4d8]/60">
                No audio tracks match "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
