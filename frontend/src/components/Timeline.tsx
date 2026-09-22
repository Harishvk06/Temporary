import React, { useState, useRef } from 'react';
import {
  Film,
  Volume2,
  VolumeX,
  Type,
  ZoomIn,
  ZoomOut,
  Scissors,
  Plus,
  Trash2,
  Music,
  MessageSquare,
  Upload,
  Sparkles,
  FolderPlus,
  GripVertical,
  Mic,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { VideoClip, TimelineTrack, VideoState } from '../types';

interface TimelineProps {
  currentTime?: number;
  duration?: number;
  onSeek: (time: number) => void;
  clips?: VideoClip[];
  videoState?: VideoState;
  onPlayPause?: () => void;
  activeFilter?: string;
  onSplitClip?: () => void;
  onMoveClip?: (clipId: string, newStartTime: number, newEndTime: number, targetTrackId?: string) => void;
  onAddTrack?: (type?: 'video' | 'audio' | 'text') => void;
  onAddAudio?: (targetTrackId?: string) => void;
  onAddText?: (targetTrackId?: string) => void;
  onDeleteClip?: (id: string) => void;
  customTracks?: TimelineTrack[];
  onToggleMuteTrack?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onRenameTrack?: (trackId: string, newName: string) => void;
  onSelectTrack?: (trackId: string) => void;
  onOpenAudioSelector?: (trackId: string, trackName: string) => void;
  onDirectAudioUpload?: (file: File, targetTrackId: string) => void;
  onGenerateSoundscape?: (targetTrackId: string) => void;
  onOpenLiveVoiceover?: (targetTrackId?: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentTime: propCurrentTime,
  duration: propDuration,
  onSeek,
  clips: propClips,
  videoState,
  onPlayPause,
  activeFilter = 'none',
  onSplitClip,
  onMoveClip,
  onAddTrack,
  onAddAudio,
  onAddText,
  onDeleteClip,
  customTracks: propCustomTracks,
  onToggleMuteTrack,
  onDeleteTrack,
  onRenameTrack,
  onSelectTrack,
  onOpenAudioSelector,
  onDirectAudioUpload,
  onGenerateSoundscape,
  onOpenLiveVoiceover,
}) => {
  const currentTime = videoState ? videoState.currentTime : (propCurrentTime || 0);
  const duration = videoState ? videoState.duration : (propDuration || 30.0);
  const clips = propClips || (videoState ? videoState.tracks.flatMap((t: any) => t.clips || []) : []);
  const customTracks = propCustomTracks || (videoState ? videoState.tracks : [
    { id: 'v1', name: 'Video V1', type: 'video' },
    { id: 'a1', name: 'Audio A1', type: 'audio' },
    { id: 't1', name: 'Text T1', type: 'text' },
  ]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState<boolean>(false);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>('');

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const draggingClipRef = useRef<{
    clipId: string;
    trackId: string;
    startMouseX: number;
    initialStartTime: number;
    clipDuration: number;
    trackWidth: number;
  } | null>(null);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);

  const handleClipMouseDown = (e: React.MouseEvent, clip: any, trackId: string) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);

    const clipElem = e.currentTarget as HTMLElement;
    const trackElem = clipElem.parentElement;
    if (!trackElem) return;

    const trackRect = trackElem.getBoundingClientRect();
    const sTime = clip.startTime !== undefined ? clip.startTime : (clip.start_time !== undefined ? clip.start_time : 0);
    const eTime = clip.endTime !== undefined ? clip.endTime : (clip.end_time !== undefined ? clip.end_time : duration);
    const clipDur = Math.max(0.1, eTime - sTime);

    draggingClipRef.current = {
      clipId: clip.id,
      trackId,
      startMouseX: e.clientX,
      initialStartTime: sTime,
      clipDuration: clipDur,
      trackWidth: trackRect.width || 1
    };
    setDraggingClipId(clip.id);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingClipRef.current) return;

      const deltaX = moveEvent.clientX - draggingClipRef.current.startMouseX;
      const deltaSeconds = (deltaX / draggingClipRef.current.trackWidth) * (duration || 1);
      let newStart = Math.max(0, draggingClipRef.current.initialStartTime + deltaSeconds);
      newStart = Math.round(newStart * 10) / 10;
      const newEnd = Math.round((newStart + draggingClipRef.current.clipDuration) * 10) / 10;

      if (onMoveClip) {
        onMoveClip(draggingClipRef.current.clipId, newStart, newEnd, draggingClipRef.current.trackId);
      }
    };

    const onMouseUp = () => {
      draggingClipRef.current = null;
      setDraggingClipId(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const filterNames: Record<string, string> = {
    vintage: 'Warm Vintage',
    blur: 'Soft Blur',
    sharpen: 'Ultra Sharpen',
    none: 'Original',
  };

  const currentFilterLabel = filterNames[activeFilter] || activeFilter;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const newTime = Math.max(0, Math.min(duration, ratio * duration));
    onSeek(newTime);
  };

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / (duration || 1)) * 100));

  const handleStartRename = (trk: TimelineTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrackId(trk.id);
    setEditingTrackName(trk.name);
  };

  const handleSaveRename = (trkId: string) => {
    if (editingTrackName.trim() && onRenameTrack) {
      onRenameTrack(trkId, editingTrackName.trim());
    }
    setEditingTrackId(null);
  };

  const handleAudioFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const defaultAudioTrack = customTracks.find((t) => t.type === 'audio')?.id || 'a1';
      onDirectAudioUpload?.(file, defaultAudioTrack);
    }
    e.target.value = '';
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-4 flex flex-col gap-3 shadow-aura-card border border-[rgba(248,250,252,0.08)] select-none">
      {/* Hidden File Input for Native Choose Audio Picker */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileInputChange}
        className="hidden"
      />

      {/* Timeline Controls & Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2 gap-2">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={onSplitClip}
            className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold text-[#dee1f9] flex items-center gap-1.5 hover:border-[#2fd9f4]/40 hover:text-[#2fd9f4] transition-all shadow-sm active:scale-95"
            title="Split selected clip at playhead"
          >
            <Scissors className="w-3.5 h-3.5 text-[#2fd9f4]" />
            Split Clip
          </button>

          {/* Add Track Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAddTrackMenu((prev) => !prev)}
              className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold text-[#dee1f9] flex items-center gap-1.5 hover:border-[#2fd9f4]/40 hover:text-[#2fd9f4] transition-all shadow-sm active:scale-95 bg-white/5 border-white/10"
              title="Add a new track layer"
            >
              <Plus className="w-3.5 h-3.5 text-[#c4c0ff]" />
              Add Track
            </button>

            {showAddTrackMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 glass-panel bg-[#0e1323]/95 border border-white/15 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-1 backdrop-blur-xl animate-fade-in">
                <button
                  onClick={() => {
                    onAddTrack?.('video');
                    setShowAddTrackMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#c4c0ff] hover:bg-white/10 rounded-lg text-left transition-colors"
                >
                  <Film className="w-4 h-4 text-[#2fd9f4]" />
                  + Video Track
                </button>
                <button
                  onClick={() => {
                    onAddTrack?.('audio');
                    setShowAddTrackMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-white/10 rounded-lg text-left transition-colors"
                >
                  <Music className="w-4 h-4 text-purple-400" />
                  + Audio Track
                </button>
                <button
                  onClick={() => {
                    onAddTrack?.('text');
                    setShowAddTrackMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-white/10 rounded-lg text-left transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  + Text Track
                </button>
              </div>
            )}
          </div>

          {/* Choose Audio Button & Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAudioMenu((prev) => !prev)}
              className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold text-[#c4c0ff] flex items-center gap-1.5 hover:border-purple-400/40 hover:text-purple-300 transition-all shadow-sm active:scale-95 bg-purple-500/10 border-purple-500/20"
              title="Select or Upload Audio File"
            >
              <Music className="w-3.5 h-3.5 text-purple-400" />
              Choose Audio
            </button>

            {showAudioMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 glass-panel bg-[#0e1323]/95 border border-white/15 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-1 backdrop-blur-xl animate-fade-in">
                <button
                  onClick={() => {
                    setShowAudioMenu(false);
                    const defaultAudioTrack = customTracks.find((t) => t.type === 'audio')?.id;
                    onOpenLiveVoiceover?.(defaultAudioTrack);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 rounded-lg text-left transition-colors"
                >
                  <Mic className="w-4 h-4 text-rose-400 animate-pulse" />
                  🎙️ Live Voiceover (Record Mic)
                </button>

                <button
                  onClick={() => {
                    setShowAudioMenu(false);
                    audioFileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/20 rounded-lg text-left transition-colors"
                >
                  <Upload className="w-4 h-4 text-purple-400" />
                  Choose File (Native Picker)
                </button>

                <button
                  onClick={() => {
                    setShowAudioMenu(false);
                    const defaultAudioTrack = customTracks.find((t) => t.type === 'audio')?.id || 'a1';
                    onGenerateSoundscape?.(defaultAudioTrack);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 rounded-lg text-left transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#2fd9f4] animate-spin" />
                  Generate Futuristic Soundscape
                </button>

                <button
                  onClick={() => {
                    setShowAudioMenu(false);
                    const defaultAudioTrack = customTracks.find((t) => t.type === 'audio')?.id || 'a1';
                    onOpenAudioSelector?.(defaultAudioTrack, 'Audio');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 rounded-lg text-left transition-colors border-t border-white/5 pt-1.5"
                >
                  <Music className="w-4 h-4 text-[#c4c0ff]" />
                  Browse Audio Library Modal
                </button>
              </div>
            )}
          </div>

          {/* Live Voiceover Quick Action Button */}
          <button
            onClick={() => onOpenLiveVoiceover?.()}
            className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 flex items-center gap-1.5 hover:border-rose-400/40 hover:text-rose-200 transition-all shadow-sm active:scale-95 bg-rose-500/10 border-rose-500/20"
            title="Record Live Voiceover with Microphone"
          >
            <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Live Voiceover
          </button>

          <button
            onClick={() => onAddText?.()}
            className="glass-panel px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2fd9f4] flex items-center gap-1.5 hover:border-cyan-400/40 hover:text-cyan-300 transition-all shadow-sm active:scale-95 bg-cyan-500/10 border-cyan-500/20"
            title="Add Text Overlay Track"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#2fd9f4]" />
            + Text Subtitle
          </button>
        </div>

        {/* Timecode Indicator */}
        <div className="font-mono text-sm font-bold text-[#2fd9f4] bg-[#080c18] px-3 py-1 rounded-md border border-[#2fd9f4]/20 shadow-inner">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Zoom & Delete Controls */}
        <div className="flex items-center gap-2">
          {selectedClipId && (
            <button
              onClick={() => {
                onDeleteClip?.(selectedClipId);
                setSelectedClipId(null);
              }}
              className="px-2 py-1 rounded text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 flex items-center gap-1 hover:bg-red-500/20"
              title="Delete selected clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Clip
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#080c18] px-2 py-0.5 rounded-md border border-white/5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1 text-[#c7c4d8] hover:text-[#2fd9f4]"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-[#c7c4d8] min-w-[36px] text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.25))}
              className="p-1 text-[#c7c4d8] hover:text-[#2fd9f4]"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Track Layout Container */}
      <div className="flex w-full min-h-[120px] max-h-[170px] overflow-y-auto bg-[#080c18]/80 rounded-xl border border-white/5 relative">
        {/* Left Track Headers Column */}
        <div className="w-48 border-r border-white/10 flex flex-col justify-start p-2 gap-2 bg-[#0e1323] flex-shrink-0 z-20">
          {customTracks.map((trk) => {
            const isMuted = Boolean(trk.muted);

            return (
              <div
                key={trk.id}
                className={`flex items-center justify-between gap-1 text-xs font-medium h-12 px-2 rounded border transition-all ${
                  trk.type === 'video'
                    ? 'text-[#c4c0ff] bg-white/5 border-[#2fd9f4]/20'
                    : trk.type === 'audio'
                    ? 'text-purple-300 bg-purple-500/10 border-purple-500/20'
                    : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20'
                }`}
              >
                {/* Track Icon & Name */}
                <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                  {trk.type === 'video' && <Film className="w-4 h-4 text-[#2fd9f4] flex-shrink-0" />}
                  {trk.type === 'audio' && <Volume2 className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                  {trk.type === 'text' && <Type className="w-4 h-4 text-cyan-400 flex-shrink-0" />}

                  {editingTrackId === trk.id ? (
                    <input
                      type="text"
                      value={editingTrackName}
                      onChange={(e) => setEditingTrackName(e.target.value)}
                      onBlur={() => handleSaveRename(trk.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(trk.id)}
                      autoFocus
                      className="bg-[#080c18] text-xs font-semibold px-1 py-0.5 rounded border border-[#2fd9f4] text-white w-full"
                    />
                  ) : (
                    <span
                      onClick={(e) => handleStartRename(trk, e)}
                      className="truncate font-semibold cursor-pointer hover:underline"
                      title="Click to rename track"
                    >
                      {trk.name}
                    </span>
                  )}
                </div>

                {/* Track Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {trk.type === 'audio' && (
                    <>
                      <button
                        onClick={() => onOpenLiveVoiceover?.(trk.id)}
                        className="p-1 rounded text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
                        title="Record Live Voiceover to this Track"
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-400" />
                      </button>

                      <button
                        onClick={() => onToggleMuteTrack?.(trk.id)}
                        className={`p-1 rounded transition-colors ${
                          isMuted ? 'text-red-400 bg-red-500/20' : 'text-[#c7c4d8] hover:text-purple-300'
                        }`}
                        title={isMuted ? 'Unmute Audio Track' : 'Mute Audio Track'}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => onOpenAudioSelector?.(trk.id, trk.name)}
                        className="p-1 rounded text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-colors"
                        title="Assign Audio File to Track"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-purple-300" />
                      </button>
                    </>
                  )}

                  {trk.type === 'text' && (
                    <button
                      onClick={() => onAddText?.(trk.id)}
                      className="p-1 rounded text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
                      title="Add Text Subtitle to Track"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {customTracks.length > 1 && (
                    <button
                      onClick={() => onDeleteTrack?.(trk.id)}
                      className="p-1 rounded text-[#c7c4d8]/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Track Canvas Area */}
        <div
          className="flex-1 relative cursor-pointer overflow-hidden p-2 flex flex-col gap-2"
          onClick={handleTimelineClick}
        >
          {/* Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#2fd9f4] z-30 pointer-events-none shadow-[0_0_10px_#2fd9f4]"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-3 h-3 bg-[#2fd9f4] rounded-full -translate-x-[5px] -translate-y-1 shadow-md"></div>
          </div>

          {/* Render Timeline Track Rows */}
          {customTracks.map((trk) => {
            const trackClips = clips.filter((c: any) => {
              const clipTrackId = c.trackId || c.track_id;
              if (clipTrackId) {
                return (
                  clipTrackId === trk.id ||
                  (trk.id === 'track-v1' && (clipTrackId === 'v1' || c.track === 'video' || c.type === 'video')) ||
                  (trk.id === 'v1' && (clipTrackId === 'track-v1' || c.track === 'video' || c.type === 'video')) ||
                  (trk.id === 'track-a1' && (clipTrackId === 'a1' || c.track === 'audio' || c.type === 'audio')) ||
                  (trk.id === 'a1' && (clipTrackId === 'track-a1' || c.track === 'audio' || c.type === 'audio'))
                );
              }
              if ((trk.id === 'v1' || trk.id === 'track-v1') && (c.track === 'video' || c.type === 'video')) return true;
              if ((trk.id === 'a1' || trk.id === 'track-a1') && (c.track === 'audio' || c.type === 'audio')) return true;
              if ((trk.id === 't1' || trk.id === 'track-t1') && (c.track === 'text' || c.type === 'text')) return true;
              return c.track === trk.type || c.type === trk.type;
            });

            return (
              <div
                key={trk.id}
                className={`h-12 w-full relative bg-[#060812] rounded-lg overflow-hidden flex items-center border border-white/10 ${
                  trk.muted ? 'opacity-50' : ''
                }`}
              >
                {trackClips.map((clip: any) => {
                  const sTime = clip.startTime !== undefined ? clip.startTime : (clip.start_time !== undefined ? clip.start_time : 0);
                  const eTime = clip.endTime !== undefined ? clip.endTime : (clip.end_time !== undefined ? clip.end_time : duration);

                  const leftPercent = Math.max(0, (sTime / (duration || 1)) * 100);
                  const widthPercent = Math.max(2, ((eTime - sTime) / (duration || 1)) * 100);
                  const isDragging = draggingClipId === clip.id;
                  const isSelected = selectedClipId === clip.id || isDragging;

                  let styleClasses = '';
                  if (trk.type === 'video') {
                    styleClasses = isSelected
                      ? 'bg-gradient-to-r from-[#2fd9f4]/80 via-[#10172a] to-[#c4c0ff]/80 border-2 border-[#2fd9f4] shadow-aura-glow ring-2 ring-[#2fd9f4]/50 z-20 cursor-grabbing'
                      : 'bg-gradient-to-r from-[#2fd9f4]/30 via-[#0e1323]/90 to-[#c4c0ff]/30 border border-[#2fd9f4]/60 hover:border-[#2fd9f4] hover:bg-white/10 cursor-grab';
                  } else if (trk.type === 'audio') {
                    styleClasses = isSelected
                      ? 'bg-purple-500/70 border-2 border-purple-400 shadow-md ring-2 ring-purple-400/50 z-20 cursor-grabbing'
                      : 'bg-purple-500/30 border border-purple-400/50 hover:border-purple-400 cursor-grab';
                  } else {
                    styleClasses = isSelected
                      ? 'bg-cyan-500/70 border-2 border-cyan-400 shadow-md ring-2 ring-cyan-400/50 z-20 cursor-grabbing'
                      : 'bg-cyan-500/30 border border-cyan-400/50 hover:border-cyan-400 cursor-grab';
                  }

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, trk.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      className={`absolute h-10 rounded-lg px-2 flex items-center justify-between text-xs font-semibold text-[#dee1f9] truncate transition-all overflow-hidden ${styleClasses}`}
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                      title={`${clip.name || 'Video Clip'} (${formatTime(sTime)} - ${formatTime(eTime)}) — Drag to reposition clip`}
                    >
                      {/* Filmstrip / Waveform background texture */}
                      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2fd9f4_1px,transparent_1px)] [background-size:8px_8px]" />

                      <div className="flex items-center gap-1 truncate relative z-10">
                        <GripVertical className="w-3.5 h-3.5 text-white/40 group-hover:text-white flex-shrink-0 cursor-grab active:cursor-grabbing" />
                        {trk.type === 'video' && <Film className="w-3.5 h-3.5 text-[#2fd9f4] flex-shrink-0" />}
                        {trk.type === 'audio' && <Music className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />}
                        {trk.type === 'text' && <Type className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />}
                        <span className="truncate font-bold text-white text-[11px]">
                          {clip.text_content || clip.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 relative z-10 flex-shrink-0 ml-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/40 text-[#2fd9f4] border border-white/10">
                          {formatTime(sTime)} - {formatTime(eTime)}
                        </span>
                        {(clip.track === 'video' || clip.type === 'video' || trk.type === 'video') && activeFilter !== 'none' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/40 font-mono">
                            {currentFilterLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty track indicator button */}
                {trackClips.length === 0 && trk.type === 'audio' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAudioSelector?.(trk.id, trk.name);
                    }}
                    className="ml-3 text-[11px] font-semibold text-purple-300/70 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"
                  >
                    <Plus className="w-3 h-3" /> Assign Audio File
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
