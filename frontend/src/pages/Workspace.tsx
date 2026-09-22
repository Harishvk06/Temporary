import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Sliders,
  Layers as LayersIcon,
  Image as ImageIcon,
  Film,
  RotateCcw,
  RotateCw,
  Download,
  Save,
  Upload,
  UserCheck,
  Lock,
  X,
  Play,
  Pause,
  Scissors,
  Zap,
  Wand2,
  FastForward,
  Palette,
  CheckCircle2,
  Maximize2,
  Undo2,
  Redo2,
} from 'lucide-react';

import { Canvas } from '../components/Canvas';
import { Toolbar } from '../components/Toolbar';
import { PreviewPane } from '../components/PreviewPane';
import { Timeline } from '../components/Timeline';
import { AgentInterface } from '../components/AgentInterface';
import { LayerPanel, Layer } from '../components/LayerPanel';
import { EffectsPanel } from '../components/EffectsPanel';
import { LiveVoiceoverModal, VoiceoverSavePayload } from '../components/LiveVoiceoverModal';
import { AudioSelectorModal } from '../components/AudioSelectorModal';
import { ExportModal } from '../components/ExportModal';
import { Toast } from '../components/Toast';
import { generateFuturisticSoundscape } from '../utils/audioGenerator';
import { ImageAdjustments, VideoState } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { readFileAsDataURL, createMediaObjectUrl, generateVideoThumbnail, outpaintImage, removeImageBackgroundAI } from '../utils/fileHelpers';
import { aiApi } from '../api/ai';
import { API_BASE_URL } from '../utils/constants';

type WorkspaceSnapshot = {
  mediaType: 'image' | 'video';
  imageSrc: string;
  videoSrc: string;
  adjustments: ImageAdjustments;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  layers: Layer[];
  strictFacial: boolean;
  facialRefUrl?: string;
  videoState?: VideoState;
};
export const Workspace: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('id');
  const initialType = searchParams.get('type') === 'video' ? 'video' : 'image';

  const { projects, addProject, updateProject } = useProjectStore();
  const currentProject = projects.find((p: any) => p.id === projectId);

  // Active Workspace Mode ('image' | 'video')
  const [mediaType, setMediaType] = useState<'image' | 'video'>(
    currentProject ? (currentProject.type as 'image' | 'video') : initialType
  );

  const [projectTitle, setProjectTitle] = useState<string>(
    currentProject?.name || `Untitled ${mediaType.toUpperCase()} Project`
  );

  // Media Source States
  const [imageSrc, setImageSrc] = useState<string>(
    currentProject?.media_url ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
  );

  const [videoSrc, setVideoSrc] = useState<string>(
    currentProject?.media_url ||
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );

  // Floating Drawer States
  const [isAgentOpen, setIsAgentOpen] = useState<boolean>(true);
  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
  const [activeToolsTab, setActiveToolsTab] = useState<'adjustments' | 'layers' | 'video' | 'facial'>('adjustments');

  // Image Editing States
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    filter: 'none'
  });

  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('select');

  // Facial Consistency Lock State
  const [strictFacial, setStrictFacial] = useState<boolean>(false);
  const [facialRefUrl, setFacialRefUrl] = useState<string | undefined>(undefined);

  // Layer Stack State
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-bg', name: 'Background Master', type: 'image', visible: true, locked: true },
    { id: 'layer-generative-fill', name: 'AI Generative Fill', type: 'adjustment', visible: true, locked: false }
  ]);
  // Text / Shape / Sticker tool selection + Brush drawing state
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(null);
  const [selectedShapeLayerId, setSelectedShapeLayerId] = useState<string | null>(null);
  const [selectedStickerLayerId, setSelectedStickerLayerId] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState<string>('#2fd9f4');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [eraserSize, setEraserSize] = useState<number>(30);
  // Real Gemini-backed Generative Fill: prevents overlapping requests and
  // drives a lightweight full-screen loading overlay while the backend works.
  const [isGeneratingFill, setIsGeneratingFill] = useState<boolean>(false);
  // Real-time progress for the client-side background removal model
  // (model download + inference), shown in the loading overlay.
  const [bgRemovalProgress, setBgRemovalProgress] = useState<string | null>(null);

  // Live Voiceover, Audio Selector & Export Modal States
  const [isVoiceoverModalOpen, setIsVoiceoverModalOpen] = useState<boolean>(false);
  const [voiceoverTargetTrackId, setVoiceoverTargetTrackId] = useState<string | undefined>(undefined);
  const [isAudioSelectorOpen, setIsAudioSelectorOpen] = useState<boolean>(false);
  const [audioSelectorTargetTrack, setAudioSelectorTargetTrack] = useState<{ id: string; name: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // ---- Transform tools ----
  const handleRotate = () => {
    saveHistory();
    setRotation((prev) => (prev + 90) % 360);
  };
  const handleFlipH = () => {
    saveHistory();
    setFlipH((prev) => !prev);
  };
  const handleFlipV = () => {
    saveHistory();
    setFlipV((prev) => !prev);
  };

  // ---- Text tool ----
  const handleAddTextLayer = () => {
    saveHistory();
    setActiveTool('text');
    const count = layers.filter((l) => l.type === 'text').length + 1;
    const newLayer: Layer = {
      id: `text-${Date.now()}`,
      name: `Text Layer ${count}`,
      visible: true,
      locked: false,
      type: 'text',
      text: 'Double-click to edit text',
      color: '#2fd9f4',
      fontSize: 24,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      x: 20 + ((count - 1) % 4) * 5,
      y: 15 + ((count - 1) % 4) * 12,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedTextLayerId(newLayer.id);
  };

  const handleSelectTextLayer = (id: string) => setSelectedTextLayerId(id);

  const handleUpdateTextLayerStyle = (id: string, updates: Partial<Layer>) => {
    saveHistory();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleMoveTextLayer = (id: string, x: number, y: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, x, y } : l)));
  };

  const handleDeleteTextLayer = (id: string) => {
    saveHistory();
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedTextLayerId((prev) => (prev === id ? null : prev));
  };

  const handleUpdateLayerText = (id: string, newText: string) => {
    saveHistory();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, text: newText } : l)));
  };

  // ---- Shape tool ----
  const handleAddShape = (shapeType: 'rectangle' | 'ellipse' | 'line') => {
    saveHistory();
    setActiveTool('shape');
    const count = layers.filter((l) => l.type === 'shape').length + 1;
    const label = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
    const newLayer: Layer = {
      id: `shape-${Date.now()}`,
      name: `${label} ${count}`,
      visible: true,
      locked: false,
      type: 'shape',
      shapeType,
      x: 30,
      y: 30,
      width: shapeType === 'line' ? 30 : 24,
      height: shapeType === 'line' ? undefined : 16,
      fillColor: shapeType === 'line' ? undefined : 'rgba(47,217,244,0.25)',
      strokeColor: '#2fd9f4',
      strokeWidth: shapeType === 'line' ? 4 : 2,
      opacity: 1,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedShapeLayerId(newLayer.id);
  };

  const handleSelectShapeLayer = (id: string) => setSelectedShapeLayerId(id);

  const handleUpdateShapeStyle = (id: string, updates: Partial<Layer>) => {
    saveHistory();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleMoveShapeLayer = (id: string, x: number, y: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, x, y } : l)));
  };

  const handleDeleteShapeLayer = (id: string) => {
    saveHistory();
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedShapeLayerId((prev) => (prev === id ? null : prev));
  };

  // ---- Brush tool ----
  const handleAddBrushStroke = (points: { x: number; y: number }[], color: string, size: number) => {
    saveHistory();
    const count = layers.filter((l) => l.type === 'brush').length + 1;
    const newLayer: Layer = {
      id: `brush-${Date.now()}`,
      name: `Brush Stroke ${count}`,
      visible: true,
      locked: false,
      type: 'brush',
      points,
      color,
      strokeWidth: size,
      opacity: 1,
    };
    setLayers((prev) => [...prev, newLayer]);
  };

  const handleClearAllBrushStrokes = () => {
    saveHistory();
    setLayers((prev) => prev.filter((l) => l.type !== 'brush'));
  };

  const handleDeleteLastBrushStroke = () => {
    saveHistory();
    setLayers((prev) => {
      const reversedIdx = [...prev].reverse().findIndex((l) => l.type === 'brush');
      if (reversedIdx === -1) return prev;
      const realIdx = prev.length - 1 - reversedIdx;
      return prev.filter((_, i) => i !== realIdx);
    });
  };

  // ---- Eraser tool (destructive — punches real transparency into the image) ----
  const handleApplyErase = (dataUrl: string) => {
    saveHistory();
    setImageSrc(dataUrl);
    setActiveTool('select');
  };

  const handleCancelErase = () => {
    setActiveTool('select');
  };

  // ---- Sticker tool ----
  const handleAddSticker = (emoji: string) => {
    saveHistory();
    setActiveTool('sticker');
    const count = layers.filter((l) => l.type === 'sticker').length + 1;
    const newLayer: Layer = {
      id: `sticker-${Date.now()}`,
      name: `Sticker ${count}`,
      visible: true,
      locked: false,
      type: 'sticker',
      emoji,
      size: 48,
      x: 40,
      y: 35,
      opacity: 1,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedStickerLayerId(newLayer.id);
  };

  // Upload a custom image and drop it in as a resizable, draggable
  // "clipart" sticker — same layer mechanics as emoji stickers, just
  // rendered as an <img> instead of text.
  const handleAddImageSticker = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataURL(file);
      saveHistory();
      setActiveTool('sticker');
      const count = layers.filter((l) => l.type === 'sticker').length + 1;
      const newLayer: Layer = {
        id: `sticker-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, '') || `Image ${count}`,
        visible: true,
        locked: false,
        type: 'sticker',
        imageUrl: dataUrl,
        size: 160,
        x: 30,
        y: 30,
        opacity: 1,
      };
      setLayers((prev) => [...prev, newLayer]);
      setSelectedStickerLayerId(newLayer.id);
    } catch (err) {
      console.error('Failed to load uploaded sticker image:', err);
      showToast('Could not load that image. Please try a different file.', 'error');
    }
  };

  const handleSelectStickerLayer = (id: string) => setSelectedStickerLayerId(id);

  const handleUpdateStickerStyle = (id: string, updates: Partial<Layer>) => {
    saveHistory();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleMoveStickerLayer = (id: string, x: number, y: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, x, y } : l)));
  };

  const handleDeleteStickerLayer = (id: string) => {
    saveHistory();
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedStickerLayerId((prev) => (prev === id ? null : prev));
  };

  // Shared delete handler used by the Layer Inspector panel — clears any
  // dangling selection state regardless of which tool the layer belongs to.
  const handleDeleteAnyLayer = (id: string) => {
    saveHistory();
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedTextLayerId((prev) => (prev === id ? null : prev));
    setSelectedShapeLayerId((prev) => (prev === id ? null : prev));
    setSelectedStickerLayerId((prev) => (prev === id ? null : prev));
  };
  // Video Editor Timeline States
  const [videoState, setVideoState] = useState<VideoState>({
    currentTime: 0,
    duration: 15,
    isPlaying: false,
    playbackRate: 1,
    volume: 100,
    isMuted: false,
    selectedTrackId: null,
    tracks: [
      {
        id: 'track-v1',
        name: 'Main Video Track',
        type: 'video',
        clips: [
          {
            id: 'clip-v1',
            trackId: 'track-v1',
            track_id: 'track-v1',
            track: 'video',
            type: 'video',
            name: 'Primary Footage',
            startTime: 0,
            endTime: 300,
            start_time: 0,
            end_time: 300,
            sourceStartTime: 0,
            sourceEndTime: 300,
            mediaUrl: videoSrc,
            color: '#2fd9f4'
          }
        ]
      },
      {
        id: 'track-a1',
        name: 'Audio Track',
        type: 'audio',
        clips: [
          {
            id: 'clip-a1',
            trackId: 'track-a1',
            track_id: 'track-a1',
            track: 'audio',
            type: 'audio',
            name: 'Background Audio',
            startTime: 0,
            endTime: 300,
            start_time: 0,
            end_time: 300,
            sourceStartTime: 0,
            sourceEndTime: 300,
            mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            color: '#c4c0ff'
          }
        ]
      }
    ],
    history: [],
    historyIndex: -1
  });

  // Image & Video Editor Undo / Redo history
  const [history, setHistory] = useState<WorkspaceSnapshot[]>([]);
  const [future, setFuture] = useState<WorkspaceSnapshot[]>([]);

  const createSnapshot = (): WorkspaceSnapshot => ({
    mediaType,
    imageSrc,
    videoSrc,
    adjustments: { ...adjustments },
    rotation,
    flipH,
    flipV,
    layers: layers.map((layer) => ({ ...layer })),
    strictFacial,
    facialRefUrl,
    videoState: JSON.parse(JSON.stringify(videoState)),
  });

  const saveHistory = () => {
    const snapshot = createSnapshot();

    setHistory((prev) => {
      const next = [...prev, snapshot];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });

    setFuture([]);
  };

  const restoreSnapshot = (snapshot: WorkspaceSnapshot) => {
    if (snapshot.mediaType) setMediaType(snapshot.mediaType);
    setImageSrc(snapshot.imageSrc);
    if (snapshot.videoSrc) setVideoSrc(snapshot.videoSrc);
    setAdjustments({ ...snapshot.adjustments });
    setRotation(snapshot.rotation);
    setFlipH(snapshot.flipH);
    setFlipV(snapshot.flipV);
    setLayers(snapshot.layers.map((layer) => ({ ...layer })));
    setStrictFacial(snapshot.strictFacial);
    setFacialRefUrl(snapshot.facialRefUrl);
    if (snapshot.videoState) setVideoState(JSON.parse(JSON.stringify(snapshot.videoState)));
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const current = createSnapshot();
    const previous = history[history.length - 1];

    setFuture((prev) => [...prev, current]);
    setHistory((prev) => prev.slice(0, -1));
    restoreSnapshot(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;

    const current = createSnapshot();
    const next = future[future.length - 1];

    setHistory((prev) => [...prev, current]);
    setFuture((prev) => prev.slice(0, -1));
    restoreSnapshot(next);
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z (Undo), Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z (Redo)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;

      const target = event.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isInput) return;

      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history, future, mediaType, imageSrc, videoSrc, adjustments, rotation, flipH, flipV, layers, strictFacial, facialRefUrl, videoState]);

  // Video duration handler

  // Video duration handler
  const handleDurationChange = (dur: number) => {
    if (!dur || isNaN(dur) || !isFinite(dur) || dur <= 0) return;
    const roundedDur = Math.round(dur * 10) / 10;
    setVideoState((prev) => {
      if (prev.duration === roundedDur) return prev;
      return {
        ...prev,
        duration: roundedDur,
        tracks: prev.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip: any) =>
            clip.id === 'clip-v1' || clip.type === 'video' || clip.track === 'video'
              ? { ...clip, endTime: roundedDur, end_time: roundedDur, sourceEndTime: roundedDur }
              : clip
          )
        }))
      };
    });
  };

    // ---- Video Editor Tools ----

  const handleTrimVideo = () => {
    saveHistory();

    const current = videoState.currentTime;
    const newDuration = Math.max(current + 1, videoState.duration - 2);

    setVideoState((prev) => ({
      ...prev,
      duration: newDuration,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip: any) => {
          if (clip.type === 'video' || clip.track === 'video') {
            return {
              ...clip,
              endTime: Math.min(clip.endTime ?? newDuration, newDuration),
              end_time: Math.min(clip.end_time ?? newDuration, newDuration),
              sourceEndTime: Math.min(
                clip.sourceEndTime ?? newDuration,
                newDuration
              ),
            };
          }
          return clip;
        }),
      })),
    }));
  };

  const handleCycleVideoSpeed = () => {
    saveHistory();

    const speeds = [1, 1.25, 1.5, 2, 0.5];
    const currentSpeed = videoState.playbackRate || 1;
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    setVideoState((prev) => ({
      ...prev,
      playbackRate: nextSpeed,
    }));
  };

  const handleCycleColorGrade = () => {
    saveHistory();

    const presets = ['none', 'vintage', 'blur', 'sharpen'];
    const currentFilter = adjustments.filter || 'none';
    const currentIndex = presets.indexOf(currentFilter);
    const nextFilter = presets[(currentIndex + 1) % presets.length];

    const presetAdjustments: Record<string, ImageAdjustments> = {
      none: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        filter: 'none',
      },
      vintage: {
        brightness: 10,
        contrast: 15,
        saturation: 20,
        temperature: 20,
        filter: 'vintage',
      },
      blur: {
        brightness: 0,
        contrast: -5,
        saturation: 0,
        temperature: 0,
        filter: 'blur',
      },
      sharpen: {
        brightness: 5,
        contrast: 30,
        saturation: 20,
        temperature: -10,
        filter: 'sharpen',
      },
    };

    setAdjustments(presetAdjustments[nextFilter]);
  };

  const handleToggleTransition = () => {
    saveHistory();

    setVideoState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip: any) => ({
          ...clip,
          transition:
            clip.type === 'video' || clip.track === 'video'
              ? 'crossfade'
              : clip.transition,
          transitionDuration:
            clip.type === 'video' || clip.track === 'video'
              ? 1.5
              : clip.transitionDuration,
        })),
      })),
    }));
  };

  // Timeline Split Clip Handler
  const handleSplitClip = () => {
    saveHistory();
    const curTime = videoState.currentTime;

    let splitOccurred = false;
    const updatedTracks = videoState.tracks.map((track) => {
      const targetClipIndex = track.clips.findIndex((c: any) => {
        const sTime = c.startTime !== undefined ? c.startTime : (c.start_time !== undefined ? c.start_time : 0);
        const eTime = c.endTime !== undefined ? c.endTime : (c.end_time !== undefined ? c.end_time : videoState.duration);
        return curTime > sTime + 0.05 && curTime < eTime - 0.05;
      });

      if (targetClipIndex === -1) return track;

      splitOccurred = true;
      const targetClip = track.clips[targetClipIndex];
      const sTime = targetClip.startTime !== undefined ? targetClip.startTime : (targetClip.start_time !== undefined ? targetClip.start_time : 0);
      const eTime = targetClip.endTime !== undefined ? targetClip.endTime : (targetClip.end_time !== undefined ? targetClip.end_time : videoState.duration);
      const splitPoint = Math.round(curTime * 10) / 10;

      const clip1 = {
        ...targetClip,
        id: `${targetClip.id}_p1`,
        name: `${targetClip.name.replace(/ \(Part \d+\)$/, '')} (Part 1)`,
        startTime: sTime,
        endTime: splitPoint,
        start_time: sTime,
        end_time: splitPoint,
        sourceStartTime: targetClip.sourceStartTime || 0,
        sourceEndTime: splitPoint,
      };

      const clip2 = {
        ...targetClip,
        id: `${targetClip.id}_p2_${Date.now()}`,
        name: `${targetClip.name.replace(/ \(Part \d+\)$/, '')} (Part 2)`,
        startTime: splitPoint,
        endTime: eTime,
        start_time: splitPoint,
        end_time: eTime,
        sourceStartTime: splitPoint,
        sourceEndTime: targetClip.sourceEndTime || eTime,
      };

      const updatedClips = [...track.clips];
      updatedClips.splice(targetClipIndex, 1, clip1, clip2);
      return { ...track, clips: updatedClips };
    });

    if (splitOccurred) {
      setVideoState((prev) => ({ ...prev, tracks: updatedTracks }));
    }
  };

  // Timeline Delete Clip Handler
  const handleDeleteClip = (clipId: string) => {
    saveHistory();
    setVideoState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c: any) => c.id !== clipId)
      }))
    }));
  };

  // Timeline Drag & Drop Reposition Handler
  const handleMoveClip = (clipId: string, newStartTime: number, newEndTime: number) => {
    setVideoState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c: any) => {
          if (c.id === clipId) {
            return {
              ...c,
              startTime: newStartTime,
              start_time: newStartTime,
              endTime: newEndTime,
              end_time: newEndTime,
              sourceStartTime: c.sourceStartTime !== undefined ? c.sourceStartTime : newStartTime,
              sourceEndTime: c.sourceEndTime !== undefined ? c.sourceEndTime : newEndTime,
            };
          }
          return c;
        })
      }))
    }));
  };

  // Track Mute Toggle Handler
  const handleToggleMuteTrack = (trackId: string) => {
    saveHistory();
    setVideoState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t: any) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      ),
    }));
  };

  // Track Rename Handler
  const handleRenameTrack = (trackId: string, newName: string) => {
    saveHistory();
    setVideoState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t: any) =>
        t.id === trackId ? { ...t, name: newName } : t
      ),
    }));
  };

  // Live Voiceover Timeline Insertion Handler
  const handleSaveVoiceover = (payload: VoiceoverSavePayload) => {
    saveHistory();
    const insertStart = Math.max(0, payload.insertTime);
    const insertEnd = Math.round((insertStart + payload.duration) * 10) / 10;

    setVideoState((prev) => {
      let updatedTracks = [...prev.tracks];
      let targetTrackId = payload.targetTrackId;

      if (payload.createNewTrack || !targetTrackId) {
        targetTrackId = `track-vo-${Date.now()}`;
        const newTrack = {
          id: targetTrackId,
          name: payload.name || `Voiceover Track ${prev.tracks.filter((t: any) => t.type === 'audio').length + 1}`,
          type: 'audio' as const,
          clips: [],
        };
        updatedTracks.push(newTrack);
      }

      const newClip = {
        id: `clip-vo-${Date.now()}`,
        trackId: targetTrackId,
        track_id: targetTrackId,
        track: 'audio' as const,
        type: 'audio',
        name: payload.name || '🎙️ Live Voiceover',
        startTime: insertStart,
        endTime: insertEnd,
        start_time: insertStart,
        end_time: insertEnd,
        sourceStartTime: 0,
        sourceEndTime: payload.duration,
        audio_url: payload.audioUrl,
        mediaUrl: payload.audioUrl,
        color: '#f43f5e',
      };

      updatedTracks = updatedTracks.map((t: any) => {
        if (t.id === targetTrackId) {
          return {
            ...t,
            clips: [...(t.clips || []), newClip],
          };
        }
        return t;
      });

      const newDuration = Math.max(prev.duration, insertEnd);

      return {
        ...prev,
        duration: newDuration,
        tracks: updatedTracks,
      };
    });
  };

  // Direct Audio File Upload Handler
  const handleDirectAudioUpload = async (file: File, targetTrackId: string) => {
    try {
      const dataUrl = await readFileAsDataURL(file);
      saveHistory();

      setVideoState((prev) => {
        let updatedTracks = [...prev.tracks];
        let targetTrk = updatedTracks.find((t: any) => t.id === targetTrackId && t.type === 'audio');
        if (!targetTrk) {
          targetTrk = updatedTracks.find((t: any) => t.type === 'audio');
        }
        if (!targetTrk) {
          const newTrackId = `track-a-${Date.now()}`;
          targetTrk = {
            id: newTrackId,
            name: 'Audio Track',
            type: 'audio' as const,
            clips: [],
          };
          updatedTracks.push(targetTrk);
        }

        const curTime = prev.currentTime || 0;
        const defaultDur = 30;
        const newClip = {
          id: `clip-audio-${Date.now()}`,
          trackId: targetTrk.id,
          track_id: targetTrk.id,
          track: 'audio' as const,
          type: 'audio',
          name: file.name.replace(/\.[^/.]+$/, '') || 'Audio Clip',
          startTime: curTime,
          endTime: curTime + defaultDur,
          start_time: curTime,
          end_time: curTime + defaultDur,
          sourceStartTime: 0,
          sourceEndTime: defaultDur,
          audio_url: dataUrl,
          mediaUrl: dataUrl,
          color: '#c4c0ff',
        };

        updatedTracks = updatedTracks.map((t: any) =>
          t.id === targetTrk.id ? { ...t, clips: [...(t.clips || []), newClip] } : t
        );

        return {
          ...prev,
          tracks: updatedTracks,
          duration: Math.max(prev.duration, curTime + defaultDur),
        };
      });
    } catch (err) {
      console.error('Failed to load uploaded audio file:', err);
    }
  };

  // Soundscape Generation Handler
  const handleGenerateSoundscape = async (targetTrackId: string) => {
    try {
      const soundscapeUrl = await generateFuturisticSoundscape();
      saveHistory();

      setVideoState((prev) => {
        let updatedTracks = [...prev.tracks];
        let targetTrk = updatedTracks.find((t: any) => t.id === targetTrackId && t.type === 'audio');
        if (!targetTrk) {
          targetTrk = updatedTracks.find((t: any) => t.type === 'audio');
        }
        if (!targetTrk) {
          const newTrackId = `track-a-${Date.now()}`;
          targetTrk = {
            id: newTrackId,
            name: 'Audio Track',
            type: 'audio' as const,
            clips: [],
          };
          updatedTracks.push(targetTrk);
        }

        const curTime = prev.currentTime || 0;
        const dur = 12;
        const newClip = {
          id: `clip-soundscape-${Date.now()}`,
          trackId: targetTrk.id,
          track_id: targetTrk.id,
          track: 'audio' as const,
          type: 'audio',
          name: 'Futuristic Soundscape',
          startTime: curTime,
          endTime: curTime + dur,
          start_time: curTime,
          end_time: curTime + dur,
          sourceStartTime: 0,
          sourceEndTime: dur,
          audio_url: soundscapeUrl,
          mediaUrl: soundscapeUrl,
          color: '#2fd9f4',
        };

        updatedTracks = updatedTracks.map((t: any) =>
          t.id === targetTrk.id ? { ...t, clips: [...(t.clips || []), newClip] } : t
        );

        return {
          ...prev,
          tracks: updatedTracks,
          duration: Math.max(prev.duration, curTime + dur),
        };
      });
    } catch (err) {
      console.error('Failed to generate soundscape:', err);
    }
  };

  // Audio Selection from Modal Handler
  const handleSelectAudioFromModal = (title: string, audioUrl: string) => {
    saveHistory();

    setVideoState((prev) => {
      let updatedTracks = [...prev.tracks];
      const targetId = audioSelectorTargetTrack?.id;
      let targetTrk = updatedTracks.find((t: any) => t.id === targetId && t.type === 'audio');
      if (!targetTrk) {
        targetTrk = updatedTracks.find((t: any) => t.type === 'audio');
      }
      if (!targetTrk) {
        const newTrackId = `track-a-${Date.now()}`;
        targetTrk = {
          id: newTrackId,
          name: 'Audio Track',
          type: 'audio' as const,
          clips: [],
        };
        updatedTracks.push(targetTrk);
      }

      const curTime = prev.currentTime || 0;
      const clipDuration = 30;
      const newClip = {
        id: `clip-audio-${Date.now()}`,
        trackId: targetTrk.id,
        track_id: targetTrk.id,
        track: 'audio' as const,
        type: 'audio',
        name: title,
        startTime: curTime,
        endTime: curTime + clipDuration,
        start_time: curTime,
        end_time: curTime + clipDuration,
        sourceStartTime: 0,
        sourceEndTime: clipDuration,
        audio_url: audioUrl,
        mediaUrl: audioUrl,
        color: '#c4c0ff',
      };

      updatedTracks = updatedTracks.map((t: any) =>
        t.id === targetTrk.id ? { ...t, clips: [...(t.clips || []), newClip] } : t
      );

      return {
        ...prev,
        tracks: updatedTracks,
        duration: Math.max(prev.duration, curTime + clipDuration),
      };
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceRefInputRef = useRef<HTMLInputElement>(null);

  // Sync state if project changes
  useEffect(() => {
    if (currentProject) {
      setMediaType(currentProject.type as 'image' | 'video');
      setProjectTitle(currentProject.name);
      if (currentProject.type === 'video' && currentProject.media_url) {
        setVideoSrc(currentProject.media_url);
      } else if (currentProject.media_url) {
        setImageSrc(currentProject.media_url);
      }
    }
  }, [currentProject]);

  // Apply edits returned from AI Orchestrator Agent
  const handleApplyEdits = (edits: any[], facialLockActive?: boolean) => {
    if (facialLockActive !== undefined) {
      setStrictFacial(facialLockActive);
    }

    edits.forEach((edit) => {
      const tool = edit.tool || edit.action;
      const params = edit.parameters || edit;

      if (tool === 'enhance_brightness' || tool === 'adjust_brightness') {
        const val = params.intensity !== undefined ? params.intensity : 20;
        setAdjustments((prev) => ({ ...prev, brightness: Math.min(100, Math.max(-100, prev.brightness + val)) }));
      } else if (tool === 'adjust_contrast') {
        const val = params.intensity !== undefined ? params.intensity : 20;
        setAdjustments((prev) => ({ ...prev, contrast: Math.min(100, Math.max(-100, prev.contrast + val)) }));
      } else if (tool === 'adjust_saturation') {
        const val = params.intensity !== undefined ? params.intensity : 25;
        setAdjustments((prev) => ({ ...prev, saturation: Math.min(100, Math.max(-100, prev.saturation + val)) }));
      } else if (tool === 'adjust_temperature') {
        const val = params.intensity !== undefined ? params.intensity : -30;
        setAdjustments((prev) => ({ ...prev, temperature: Math.min(100, Math.max(-100, val)) }));
      } else if (tool === 'apply_filter') {
        const fName = params.filter_name || 'vintage';
        setAdjustments((prev) => ({ ...prev, filter: fName }));
      } else if (tool === 'remove_background') {
        handleRemoveBackground();
      } else if (tool === 'generative_fill' || tool === 'outpaint_canvas') {
        setLayers((prev) => [
          ...prev,
          { id: `layer-gen-${Date.now()}`, name: edit.description || 'AI Generative Layer', type: 'image', visible: true, locked: false }
        ]);
      } else if (tool === 'strict_facial_lock') {
        setStrictFacial(true);
        if (params.facial_ref_url) setFacialRefUrl(params.facial_ref_url);
      }
    });

    // Auto-open Tools drawer on AI execution so user sees updated parameters
    setIsToolsOpen(true);
  };

  // Background removal — genuinely AI-powered but fully client-side (no
  // API key, no backend call, no quota/billing). Uses an in-browser ML
  // segmentation model to correctly isolate the subject even on busy,
  // full-bleed artwork where simple color-based matting fails.
  const handleRemoveBackground = async () => {
    if (!imageSrc) return;
    if (isGeneratingFill) return; // reuse the same in-flight guard/overlay
    setIsGeneratingFill(true);
    setBgRemovalProgress('Starting…');

    try {
      const transparentUrl = await removeImageBackgroundAI(imageSrc, (key, current, total) => {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        const label = key.toLowerCase().includes('fetch') ? 'Downloading AI model' : 'Analyzing image';
        setBgRemovalProgress(`${label}… ${pct}%`);
      });
      saveHistory();
      setImageSrc(transparentUrl);
      setLayers((prev) => [
        ...prev,
        { id: `layer-matting-${Date.now()}`, name: 'AI Matting Alpha Foreground', type: 'image', visible: true, locked: false }
      ]);
      setIsToolsOpen(true);
      setActiveToolsTab('layers');
    } catch (err: any) {
      console.error('Background removal error:', err);
      showToast(`Background removal failed: ${err?.message || 'Unknown error. Try a different image.'}`, 'error');
    } finally {
      setIsGeneratingFill(false);
      setBgRemovalProgress(null);
    }
  };

  // Generative Fill — sends the current image + prompt to the real backend
  // endpoint (POST /ai/generative-fill), which calls Gemini's image model
  // and returns a genuinely regenerated/edited image based on the prompt.
  const handleGenerativeFill = async (prompt: string) => {
    if (!prompt || !prompt.trim() || !imageSrc) return;
    if (isGeneratingFill) return; // guard against overlapping requests
    setIsGeneratingFill(true);

    try {
      // Works for data URLs, blob URLs, and remote URLs alike
      const sourceResponse = await fetch(imageSrc);
      const sourceBlob = await sourceResponse.blob();

      const formData = new FormData();
      formData.append('image', sourceBlob, 'source.png');
      formData.append('prompt', prompt.trim());

      const result = await aiApi.generativeFill(formData);

      // result_url is backend-relative (e.g. "/uploads/generative_fill/xxx.png"),
      // served from the backend's root — not under the "/api" prefix — so
      // resolve it against the backend origin rather than API_BASE_URL directly.
      const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
      const finalUrl = result.result_url.startsWith('http')
        ? result.result_url
        : `${backendOrigin}${result.result_url}`;

      saveHistory();
      setImageSrc(finalUrl);
      setLayers((prev) => [
        ...prev,
        {
          id: `layer-fill-${Date.now()}`,
          name: `AI Fill: "${prompt.length > 28 ? `${prompt.slice(0, 28)}…` : prompt}"`,
          type: 'image',
          visible: true,
          locked: false,
        },
      ]);
      setActiveTool('select');
      setIsToolsOpen(true);
      setActiveToolsTab('layers');
    } catch (err: any) {
      console.error('Generative Fill error:', err);
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Generative Fill failed. Make sure the backend server is running and GEMINI_API_API_KEY is set in backend/.env.';
      showToast(`Generative Fill: ${message}`, 'error');
    } finally {
      setIsGeneratingFill(false);
    }
  };

  // Outpaint Canvas — genuinely expands the image dimensions client-side and
  // fills the new border with a blurred continuation of the source image.
  const handleOutpaint = async (marginPercent: number) => {
    if (!imageSrc) return;
    saveHistory();
    try {
      const expandedUrl = await outpaintImage(imageSrc, marginPercent);
      setImageSrc(expandedUrl);
      setLayers((prev) => [
        ...prev,
        { id: `layer-outpaint-${Date.now()}`, name: `AI Outpaint +${marginPercent}%`, type: 'image', visible: true, locked: false }
      ]);
      setActiveTool('select');
      setIsToolsOpen(true);
      setActiveToolsTab('layers');
    } catch (err) {
      console.warn('Outpaint error:', err);
    }
  };

  // Image-to-Video Pipeline: Automatically transitions the workspace from
  // Image Editing to Video Editing and synthesizes an MP4 motion video.
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoGenProgress, setVideoGenProgress] = useState<string | null>(null);

  const handleMakePhotoIntoVideo = async (
    userPrompt: string = 'Animate this photo with Google Flow cinematic 3D motion and living background elements',
    motionStyle: string = 'google_flow_cinematic'
  ) => {
    if (!imageSrc) return;

    // 1. Immediately transition workspace from Image Editor to Video Editor
    saveHistory();
    setMediaType('video');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('type', 'video');
      return next;
    });

    setIsGeneratingVideo(true);
    setVideoGenProgress('Analyzing photo structure & computing 2.5D depth decomposition...');

    const styleLabels: Record<string, string> = {
      google_flow_cinematic: 'Google Flow 3D Cinematic',
      orbit_3d: '3D Orbit (House/Subject)',
      celestial_stars_flow: 'Celestial Stars & Sky Flow',
      living_waters_sea: 'Living Ocean Waves & Coastal Dolly',
      dolly_zoom_vertigo: 'Hitchcock Dolly Zoom',
      cyberpunk_pulse: 'Cyberpunk Depth Pulse',
      cinematic_pan_zoom: 'Ken Burns Pan & Zoom',
    };
    const friendlyStyleName = styleLabels[motionStyle] || 'Google Flow 3D';

    try {
      const sourceResponse = await fetch(imageSrc);
      const sourceBlob = await sourceResponse.blob();

      const formData = new FormData();
      formData.append('image', sourceBlob, 'photo.png');
      formData.append('prompt', userPrompt);
      formData.append('motion_style', motionStyle);
      formData.append('duration', '4.0');

      setVideoGenProgress(`Rendering ${friendlyStyleName} with living background elements...`);
      const result = await aiApi.imageToVideo(formData);

      const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
      const finalUrl = result.video_url.startsWith('http')
        ? result.video_url
        : `${backendOrigin}${result.video_url}`;

      setVideoSrc(finalUrl);

      // Create video track clip in timeline
      const clipDuration = result.duration || 4.0;
      const newClip = {
        id: `clip-img2vid-${Date.now()}`,
        name: `${friendlyStyleName}`,
        startTime: 0,
        endTime: clipDuration,
        duration: clipDuration,
        start_time: 0,
        end_time: clipDuration,
        trackId: 'track-1',
        sourceUrl: finalUrl,
        source_url: finalUrl,
        mediaUrl: finalUrl,
        media_url: finalUrl,
        url: finalUrl,
        type: 'video' as const,
      };

      setVideoState((prev) => ({
        ...prev,
        duration: clipDuration,
        currentTime: 0,
        isPlaying: true,
        tracks: [
          {
            id: 'track-1',
            name: 'AI Video Master Track',
            type: 'video',
            clips: [newClip],
          },
          ...prev.tracks.filter((t) => t.id !== 'track-1'),
        ],
      }));

      // Update project store if applicable
      if (projectId && updateProject) {
        updateProject(projectId, {
          media_url: finalUrl,
          type: 'video',
          thumbnail_url: result.thumbnail_url ? `${backendOrigin}${result.thumbnail_url}` : undefined,
        });
      }
    } catch (err: any) {
      console.error('Image-to-Video generation error:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Video generation failed.';
      showToast(`Image-to-Video notice: ${msg}`, 'info');
    } finally {
      setIsGeneratingVideo(false);
      setVideoGenProgress(null);
    }
  };

  // Upload handler for master media
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    saveHistory();
    const isVideo = file.type.startsWith('video');
    if (isVideo) {
      const url = createMediaObjectUrl(file);
      setVideoSrc(url);
      setMediaType('video');

      setVideoState((prev) => ({
        ...prev,
        currentTime: 0,
        tracks: prev.tracks.map((trk) => {
          if (trk.type === 'video') {
            return {
              ...trk,
              clips: [
                {
                  id: `clip-v-${Date.now()}`,
                  name: file.name || 'Uploaded Video',
                  startTime: 0,
                  endTime: prev.duration || 30,
                  start_time: 0,
                  end_time: prev.duration || 30,
                  sourceStartTime: 0,
                  sourceEndTime: prev.duration || 30,
                  mediaUrl: url,
                  media_url: url,
                  type: 'video',
                  track: 'video',
                }
              ]
            };
          }
          return trk;
        })
      }));
    } else {
      const url = await readFileAsDataURL(file);
      setImageSrc(url);
      setMediaType('image');
    }
  };

  // Upload handler for facial reference image
  const handleFacialRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const refUrl = URL.createObjectURL(file);
    setFacialRefUrl(refUrl);
    setStrictFacial(true);
  };

  const handleSaveProject = () => {
    const pId = projectId || `proj-${Date.now()}`;
    const newProj = {
      id: pId,
      user_id: 'user-1',
      name: projectTitle,
      description: `Unified Workspace AI session (${mediaType.toUpperCase()})`,
      type: mediaType,
      thumbnail_url: mediaType === 'video' ? 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80' : imageSrc,
      media_url: mediaType === 'video' ? videoSrc : imageSrc,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_edited_at: 'Just now'
    };

    if (currentProject) {
      updateProject(pId, newProj);
    } else {
      addProject(newProj);
    }
    showToast('Project saved successfully to AuraEdit Cloud storage!', 'success');
  };

  return (
    <div className="w-screen h-screen bg-[#06060c] text-[#c7c4d8] flex flex-col overflow-hidden select-none font-sans">
      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" className="hidden" />
      <input type="file" ref={faceRefInputRef} onChange={handleFacialRefUpload} accept="image/*" className="hidden" />

      {/* Top Minimalist Header Navigation Bar */}
      <header className="h-14 px-5 bg-[#090d1a]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between z-40 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl glass-panel text-[#c7c4d8] hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#2fd9f4]" />
            Dashboard
          </button>

          <div className="h-5 w-[1px] bg-white/10" />

          {/* Project Title Input */}
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="bg-transparent text-sm font-extrabold text-[#dee1f9] outline-none border-b border-transparent focus:border-[#2fd9f4] transition-colors px-1"
          />

          {/* Media Mode Toggle Button */}
          <div className="flex items-center bg-[#0e1323] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setMediaType('image')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mediaType === 'image'
                  ? 'bg-gradient-to-r from-[#c4c0ff]/30 to-[#2fd9f4]/30 text-[#2fd9f4] border border-[#2fd9f4]/40 shadow-aura-glow'
                  : 'text-[#c7c4d8]/70 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Image
            </button>
            <button
              onClick={() => setMediaType('video')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mediaType === 'video'
                  ? 'bg-gradient-to-r from-[#c4c0ff]/30 to-[#2fd9f4]/30 text-[#2fd9f4] border border-[#2fd9f4]/40 shadow-aura-glow'
                  : 'text-[#c7c4d8]/70 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Video
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Facial Lock Badge */}
          {strictFacial && (
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Face Lock Active
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl glass-panel text-[#c7c4d8] hover:text-[#2fd9f4] transition-all"
            title="Upload New Media"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveProject}
            className="p-2 rounded-xl glass-panel text-[#c7c4d8] hover:text-[#2fd9f4] transition-all"
            title="Save Project"
          >
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="gradient-btn px-4 py-1.5 rounded-xl text-xs font-bold text-[#06060c] flex items-center gap-1.5 shadow-aura-glow active:scale-95"
            title="Export Master Render"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>

      {/* Workspace Quick Actions & History Toolbar (Undo / Redo / Tools) */}
      <div className="h-14 px-5 bg-[#080c18]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-center flex-shrink-0 z-30">
        <div className="flex items-center gap-1.5 bg-[#10172a] px-2.5 py-1.5 rounded-2xl border border-white/10 shadow-lg shadow-black/20 overflow-x-auto max-w-full">
          {/* History Undo / Redo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              history.length > 0
                ? 'text-[#dee1f9] hover:text-white hover:bg-white/10 bg-white/5 border border-white/10 shadow-sm'
                : 'text-white/25 cursor-not-allowed opacity-50'
            }`}
            title={`Undo (Ctrl+Z) — ${history.length} available steps`}
          >
            <Undo2 className="w-4 h-4 text-[#2fd9f4]" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              future.length > 0
                ? 'text-[#dee1f9] hover:text-white hover:bg-white/10 bg-white/5 border border-white/10 shadow-sm'
                : 'text-white/25 cursor-not-allowed opacity-50'
            }`}
            title={`Redo (Ctrl+Y or Ctrl+Shift+Z) — ${future.length} available steps`}
          >
            <Redo2 className="w-4 h-4 text-[#c4c0ff]" />
            <span>Redo</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-1.5" />

          {mediaType === 'image' ? (
            <span className="px-2 text-[11px] font-mono text-[#2fd9f4] whitespace-nowrap">
              {rotation}°
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-[#2fd9f4]/10 border border-[#2fd9f4]/30 text-[11px] font-mono text-[#2fd9f4] whitespace-nowrap flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#2fd9f4]" />
              Video Editor (4K 60FPS Multi-Track)
            </span>
          )}
        </div>
      </div>

      {/* Main 100% Full-Screen Workspace Body */}
      <div className="relative flex-1 w-full h-[calc(100vh-112px)] flex overflow-hidden">
        {/* Floating Left Drawer Toggle Button */}
        {!isAgentOpen && (
          <button
            onClick={() => setIsAgentOpen(true)}
            className="fixed top-20 left-6 z-40 px-3.5 py-2.5 rounded-2xl glass-panel border border-[#2fd9f4]/40 bg-[#06060c]/90 text-[#2fd9f4] flex items-center gap-2 shadow-aura-glow hover:scale-105 active:scale-95 transition-all group"
            title="Open AI Orchestrator Drawer"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold">AI Agent</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        )}

        {/* AI Orchestrator Left Collapsible Drawer */}
        <AgentInterface
          isOpen={isAgentOpen}
          onClose={() => setIsAgentOpen(false)}
          mediaType={mediaType}
          mediaId={projectId || 'master-1'}
          mediaUrl={mediaType === 'image' ? imageSrc : videoSrc}
          thumbnailUrl={imageSrc}
          sessionId={projectId ? `project-${projectId}` : 'workspace-master-session'}
          onApplyEdits={handleApplyEdits}
          strictFacialConsistency={strictFacial}
          onToggleStrictFacial={(active, refUrl) => {
            setStrictFacial(active);
            if (refUrl) setFacialRefUrl(refUrl);
          }}
          facialRefUrl={facialRefUrl}
          onMakePhotoIntoVideo={handleMakePhotoIntoVideo}
        />

        {/* Central Full-Screen Media Canvas */}
        <main className="flex-1 w-full h-full flex flex-col p-4 overflow-hidden relative">
          {mediaType === 'image' ? (
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
              <Toolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onRotate={handleRotate}
                onFlipH={handleFlipH}
                onFlipV={handleFlipV}
                onRemoveBackground={handleRemoveBackground}
                onGenerativeFill={handleGenerativeFill}
                onOutpaint={handleOutpaint}
                onText={handleAddTextLayer}
                onLayers={() => {
                  setActiveTool('layers');
                  setIsToolsOpen(true);
                  setActiveToolsTab('layers');
                }}
                strictFacialConsistency={strictFacial}
                onToggleStrictFacial={() => setStrictFacial((prev) => !prev)}
                textLayers={layers.filter((l) => l.type === 'text')}
                selectedTextLayerId={selectedTextLayerId}
                onSelectTextLayer={handleSelectTextLayer}
                onAddTextLayer={handleAddTextLayer}
                onUpdateTextLayerStyle={handleUpdateTextLayerStyle}
                onDeleteTextLayer={handleDeleteTextLayer}
                shapeLayers={layers.filter((l) => l.type === 'shape')}
                selectedShapeLayerId={selectedShapeLayerId}
                onSelectShapeLayer={handleSelectShapeLayer}
                onAddShape={handleAddShape}
                onUpdateShapeStyle={handleUpdateShapeStyle}
                onDeleteShapeLayer={handleDeleteShapeLayer}
                brushColor={brushColor}
                brushSize={brushSize}
                onBrushColorChange={setBrushColor}
                onBrushSizeChange={setBrushSize}
                brushStrokeCount={layers.filter((l) => l.type === 'brush').length}
                onClearAllBrushStrokes={handleClearAllBrushStrokes}
                onDeleteLastBrushStroke={handleDeleteLastBrushStroke}
                eraserSize={eraserSize}
                onEraserSizeChange={setEraserSize}
                stickerLayers={layers.filter((l) => l.type === 'sticker')}
                selectedStickerLayerId={selectedStickerLayerId}
                onSelectStickerLayer={handleSelectStickerLayer}
                onAddSticker={handleAddSticker}
                onAddImageSticker={handleAddImageSticker}
                onUpdateStickerStyle={handleUpdateStickerStyle}
                onDeleteStickerLayer={handleDeleteStickerLayer}
              />
              <Canvas
                imageSrc={imageSrc}
                adjustments={adjustments}
                rotation={rotation}
                flipH={flipH}
                flipV={flipV}
                activeTool={activeTool}
                layers={layers}
                onApplyCrop={(croppedUrl) => {
                  setImageSrc(croppedUrl);
                  setActiveTool('select');
                }}
                onCancelCrop={() => setActiveTool('select')}
                onUpdateLayerText={handleUpdateLayerText}
                selectedTextLayerId={selectedTextLayerId}
                onSelectTextLayer={handleSelectTextLayer}
                onMoveTextLayer={handleMoveTextLayer}
                onDeleteTextLayer={handleDeleteTextLayer}
                selectedShapeLayerId={selectedShapeLayerId}
                onSelectShapeLayer={handleSelectShapeLayer}
                onMoveShapeLayer={handleMoveShapeLayer}
                onDeleteShapeLayer={handleDeleteShapeLayer}
                brushColor={brushColor}
                brushSize={brushSize}
                onAddBrushStroke={handleAddBrushStroke}
                eraserSize={eraserSize}
                onApplyErase={handleApplyErase}
                onCancelErase={handleCancelErase}
                selectedStickerLayerId={selectedStickerLayerId}
                onSelectStickerLayer={handleSelectStickerLayer}
                onMoveStickerLayer={handleMoveStickerLayer}
                onDeleteStickerLayer={handleDeleteStickerLayer}
              />
            </div>
             ) : (
               <div className="flex-1 w-full h-full flex flex-col gap-4 overflow-hidden">
               {/* Video Editor Area */}
              <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

                {/* LEFT VIDEO TOOLBAR */}
                <aside className="w-16 flex-shrink-0 glass-panel rounded-2xl p-2 flex flex-col items-center gap-3 border border-white/10 shadow-aura-card">

                  {/* Trim */}
                  <button
                    type="button"
                    onClick={handleTrimVideo}
                    className="w-11 h-11 rounded-xl glass-panel text-[#2fd9f4] border border-[#2fd9f4]/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                    title="Trim Video"
                  >
                    <Scissors className="w-5 h-5" />
                  </button>

                  {/* Split */}
                  <button
                    type="button"
                    onClick={handleSplitClip}
                    className="w-11 h-11 rounded-xl glass-panel text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5 hover:border-[#2fd9f4]/40 flex items-center justify-center transition-all active:scale-95"
                    title="Split Clip at Playhead"
                  >
                    <Film className="w-5 h-5" />
                  </button>

                  {/* Transition */}
                  <button
                    type="button"
                    onClick={handleToggleTransition}
                    className="w-11 h-11 rounded-xl glass-panel text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5 hover:border-[#2fd9f4]/40 flex items-center justify-center transition-all active:scale-95"
                    title="Add Crossfade Transition"
                  >
                    <Zap className="w-5 h-5" />
                  </button>

                  {/* Speed */}
                  <button
                    type="button"
                    onClick={handleCycleVideoSpeed}
                    className={`w-11 h-11 rounded-xl glass-panel flex items-center justify-center transition-all active:scale-95 ${
                      videoState.playbackRate !== 1
                        ? 'text-[#2fd9f4] border border-[#2fd9f4]/40 bg-[#2fd9f4]/10 shadow-aura-glow'
                        : 'text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5'
                    }`}
                    title={`Playback Speed: ${videoState.playbackRate}x`}
                  >
                    <FastForward className="w-5 h-5" />
                  </button>

                  {/* Color Grade */}
                  <button
                    type="button"
                    onClick={handleCycleColorGrade}
                    className={`w-11 h-11 rounded-xl glass-panel flex items-center justify-center transition-all active:scale-95 ${
                      adjustments.filter !== 'none'
                        ? 'text-[#2fd9f4] border border-[#2fd9f4]/40 bg-[#2fd9f4]/10 shadow-aura-glow'
                        : 'text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5'
                    }`}
                    title={`Color Grade: ${adjustments.filter}`}
                  >
                    <Palette className="w-5 h-5" />
                  </button>

                </aside>

                {/* VIDEO PREVIEW */}
                <div className="flex-1 min-w-0 min-h-0">
                  <PreviewPane
                    videoSrc={videoSrc}
                    videoState={videoState}
                    currentTime={videoState.currentTime}
                    duration={videoState.duration}
                    isPlaying={videoState.isPlaying}
                    volume={videoState.volume}
                    isMuted={videoState.isMuted}
                    playbackRate={videoState.playbackRate}
                    adjustments={adjustments}
                    onTimeUpdate={(t) =>
                      setVideoState((prev) => ({
                        ...prev,
                        currentTime: t,
                      }))
                    }
                    onDurationChange={handleDurationChange}
                    onPlayPause={() =>
                      setVideoState((prev) => ({
                        ...prev,
                        isPlaying: !prev.isPlaying,
                      }))
                    }
                    onVolumeChange={(v) =>
                      setVideoState((prev) => ({
                        ...prev,
                        volume: v,
                      }))
                    }
                    onToggleMute={() =>
                      setVideoState((prev) => ({
                        ...prev,
                        isMuted: !prev.isMuted,
                      }))
                    }
                  />
                </div>

              </div>

              {/* VIDEO TIMELINE */}
              <Timeline
                videoState={videoState}
                duration={videoState.duration}
                onSeek={(t) =>
                  setVideoState((prev) => ({
                    ...prev,
                    currentTime: t,
                  }))
                }
                onPlayPause={() =>
                  setVideoState((prev) => ({
                    ...prev,
                    isPlaying: !prev.isPlaying,
                  }))
                }
                onSplitClip={handleSplitClip}
                onDeleteClip={handleDeleteClip}
                onMoveClip={handleMoveClip}
                onAddTrack={(type) => {
                  saveHistory();

                  const trkType = type || 'video';

                  const newTrack = {
                    id: `track-${Date.now()}`,
                    name: `${trkType.toUpperCase()} Track`,
                    type: trkType,
                    clips: [],
                  };

                  setVideoState((prev) => ({
                    ...prev,
                    tracks: [...prev.tracks, newTrack],
                  }));
                }}
                onDeleteTrack={(id) => {
                  saveHistory();

                  setVideoState((prev) => ({
                    ...prev,
                    tracks: prev.tracks.filter((t) => t.id !== id),
                  }));
                }}
                onSelectTrack={(id) =>
                  setVideoState((prev) => ({
                    ...prev,
                    selectedTrackId: id,
                  }))
                }
                onToggleMuteTrack={handleToggleMuteTrack}
                onRenameTrack={handleRenameTrack}
                onOpenLiveVoiceover={(targetTrackId) => {
                  setVoiceoverTargetTrackId(targetTrackId);
                  setIsVoiceoverModalOpen(true);
                }}
                onOpenAudioSelector={(trackId, trackName) => {
                  setAudioSelectorTargetTrack({ id: trackId, name: trackName });
                  setIsAudioSelectorOpen(true);
                }}
                onDirectAudioUpload={handleDirectAudioUpload}
                onGenerateSoundscape={handleGenerateSoundscape}
              />

            </div>
          )}
        </main>

        {/* Floating Right Tools Drawer Toggle Button */}
        {!isToolsOpen && (
          <button
            onClick={() => setIsToolsOpen(true)}
            className="fixed top-20 right-6 z-40 px-3.5 py-2.5 rounded-2xl glass-panel border border-white/20 bg-[#06060c]/90 text-[#dee1f9] hover:text-[#2fd9f4] hover:border-[#2fd9f4]/40 flex items-center gap-2 shadow-aura-glow hover:scale-105 active:scale-95 transition-all"
            title="Open Reveal-on-Demand Tools Drawer"
          >
            <Sliders className="w-4 h-4 text-[#2fd9f4]" />
            <span className="text-xs font-bold">Tools & Inspector</span>
          </button>
        )}

        {/* Right Side Reveal-on-Demand Tools Drawer */}
        {isToolsOpen && (
          <aside className="fixed top-20 right-6 z-50 w-80 h-[calc(100vh-110px)] glass-panel rounded-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden bg-[#06060c]/95 backdrop-blur-2xl animate-fadeIn">
            {/* Tools Drawer Header */}
            <div className="h-12 px-4 bg-[#0d1222] border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xs font-bold text-[#dee1f9] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2fd9f4]" />
                Tools & Adjustments
              </h3>
              <button
                onClick={() => setIsToolsOpen(false)}
                className="p-1 rounded-lg glass-panel text-[#c7c4d8] hover:text-white transition-colors"
                title="Close Tools Panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tools Category Tabs */}
            <div className="flex items-center border-b border-white/10 bg-[#090d1a] p-1 flex-shrink-0">
              <button
                onClick={() => setActiveToolsTab('adjustments')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  activeToolsTab === 'adjustments'
                    ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/40'
                    : 'text-[#c7c4d8]/70 hover:text-white'
                }`}
              >
                Adjustments
              </button>
              <button
                onClick={() => setActiveToolsTab('layers')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  activeToolsTab === 'layers'
                    ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/40'
                    : 'text-[#c7c4d8]/70 hover:text-white'
                }`}
              >
                Layers
              </button>
              <button
                onClick={() => setActiveToolsTab('facial')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  activeToolsTab === 'facial'
                    ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/40'
                    : 'text-[#c7c4d8]/70 hover:text-white'
                }`}
              >
                Face Lock
              </button>
            </div>

            {/* Tools Body Content */}
            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin flex flex-col gap-5">
              {activeToolsTab === 'adjustments' && (
                <div className="flex flex-col gap-4">
                  {/* Slider Controls */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex justify-between text-xs text-[#c7c4d8] mb-1">
                        <span>Brightness</span>
                        <span className="font-mono text-[#2fd9f4]">{adjustments.brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.brightness}
                        onChange={(e) =>
                          setAdjustments((prev) => ({ ...prev, brightness: Number(e.target.value) }))
                        }
                        className="w-full accent-[#2fd9f4]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#c7c4d8] mb-1">
                        <span>Contrast</span>
                        <span className="font-mono text-[#2fd9f4]">{adjustments.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.contrast}
                        onChange={(e) =>
                          setAdjustments((prev) => ({ ...prev, contrast: Number(e.target.value) }))
                        }
                        className="w-full accent-[#2fd9f4]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#c7c4d8] mb-1">
                        <span>Saturation</span>
                        <span className="font-mono text-[#2fd9f4]">{adjustments.saturation}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.saturation}
                        onChange={(e) =>
                          setAdjustments((prev) => ({ ...prev, saturation: Number(e.target.value) }))
                        }
                        className="w-full accent-[#2fd9f4]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#c7c4d8] mb-1">
                        <span>Temperature</span>
                        <span className="font-mono text-[#2fd9f4]">{adjustments.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments.temperature}
                        onChange={(e) =>
                          setAdjustments((prev) => ({ ...prev, temperature: Number(e.target.value) }))
                        }
                        className="w-full accent-[#2fd9f4]"
                      />
                    </div>
                  </div>

                  {/* Filter Presets Grid */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <span className="text-xs font-semibold text-[#dee1f9]">Filter Presets</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['none', 'vintage', 'blur', 'sharpen'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setAdjustments((prev) => ({ ...prev, filter: f }))}
                          className={`py-2 px-3 rounded-xl text-xs capitalize font-medium transition-all ${
                            adjustments.filter === f
                              ? 'bg-[#2fd9f4] text-[#06060c] font-bold shadow-aura-glow'
                              : 'glass-panel text-[#c7c4d8] hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() =>
                      setAdjustments({ brightness: 0, contrast: 0, saturation: 0, temperature: 0, filter: 'none' })
                    }
                    className="mt-2 py-2 w-full glass-panel text-xs text-[#c7c4d8] hover:text-red-400 rounded-xl transition-colors"
                  >
                    Reset All Adjustments
                  </button>
                </div>
              )}

              {activeToolsTab === 'layers' && (
                <LayerPanel
                  layers={layers}
                  onToggleVisibility={(id) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
                    )
                  }
                  onToggleLock={(id) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
                    )
                  }
                  onDeleteLayer={(id) => handleDeleteAnyLayer(id)}
                  onAddLayer={(type) =>
                    setLayers((prev) => [
                      ...prev,
                      {
                        id: `layer-${Date.now()}`,
                        name: `New ${type.toUpperCase()} Layer`,
                        type,
                        visible: true,
                        locked: false
                      }
                    ])
                  }
                />
              )}

              {activeToolsTab === 'facial' && (
                <div className="flex flex-col gap-4 text-xs">
                  <div className="p-3 glass-panel rounded-xl border border-emerald-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        Strict Facial Lock
                      </span>
                      <input
                        type="checkbox"
                        checked={strictFacial}
                        onChange={(e) => setStrictFacial(e.target.checked)}
                        className="w-4 h-4 accent-emerald-400 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-[#c7c4d8]/80 leading-relaxed">
                      Locks facial landmark geometry, eye-distance ratios, and identity embeddings across AI generative edits.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="font-semibold text-[#dee1f9]">Reference Identity Image</span>
                    {facialRefUrl ? (
                      <div className="relative w-full h-40 rounded-xl overflow-hidden border border-emerald-400/40">
                        <img src={facialRefUrl} alt="Facial Reference" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setFacialRefUrl(undefined)}
                          className="absolute top-2 right-2 p-1 bg-black/70 rounded-lg text-white hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => faceRefInputRef.current?.click()}
                        className="w-full py-8 glass-panel border-dashed border-white/20 hover:border-[#2fd9f4]/50 rounded-xl flex flex-col items-center gap-2 text-[#c7c4d8] hover:text-[#2fd9f4] transition-all"
                      >
                        <Upload className="w-5 h-5" />
                        <span>Upload Reference Face</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Generative Fill loading overlay — shown while Gemini processes the request */}
      {isGeneratingFill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel px-6 py-4 rounded-2xl border border-[#2fd9f4]/40 shadow-aura-glow flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#2fd9f4] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-[#dee1f9]">{bgRemovalProgress || 'Processing image…'}</span>
          </div>
        </div>
      )}

      {/* Image-to-Video Synthesis Loading Overlay */}
      {isGeneratingVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="glass-panel px-8 py-6 rounded-3xl border border-[#2fd9f4]/50 shadow-[0_0_50px_rgba(47,217,244,0.3)] flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] p-[1px] shadow-aura-glow flex items-center justify-center">
              <div className="w-full h-full bg-[#06060c] rounded-[15px] flex items-center justify-center">
                <Film className="w-6 h-6 text-[#2fd9f4] animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-[#dee1f9]">Synthesizing AI Video</h4>
              <p className="text-xs text-[#c7c4d8]/80 mt-1">
                {videoGenProgress || 'Transitioning to Video Editor & rendering 60fps MP4 master...'}
              </p>
            </div>
            <div className="w-full h-1.5 bg-[#0e1323] rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-[#2fd9f4] to-[#c4c0ff] animate-pulse w-3/4 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Live Voiceover Recording Studio Modal */}
      <LiveVoiceoverModal
        isOpen={isVoiceoverModalOpen}
        onClose={() => setIsVoiceoverModalOpen(false)}
        currentTime={videoState.currentTime}
        duration={videoState.duration}
        availableTracks={videoState.tracks}
        defaultTargetTrackId={voiceoverTargetTrackId}
        onSaveVoiceover={handleSaveVoiceover}
        onStartSyncPlayback={(startTime) => {
          setVideoState((prev) => ({
            ...prev,
            currentTime: startTime,
            isPlaying: true,
          }));
        }}
        onPauseSyncPlayback={() => {
          setVideoState((prev) => ({
            ...prev,
            isPlaying: false,
          }));
        }}
        onResumeSyncPlayback={() => {
          setVideoState((prev) => ({
            ...prev,
            isPlaying: true,
          }));
        }}
        onStopSyncPlayback={() => {
          setVideoState((prev) => ({
            ...prev,
            isPlaying: false,
          }));
        }}
      />

      {/* Audio Preset & File Selector Modal */}
      <AudioSelectorModal
        isOpen={isAudioSelectorOpen}
        onClose={() => {
          setIsAudioSelectorOpen(false);
          setAudioSelectorTargetTrack(null);
        }}
        targetTrackName={audioSelectorTargetTrack?.name || 'Audio Track'}
        onSelectAudio={handleSelectAudioFromModal}
        onOpenLiveVoiceover={() => {
          setIsAudioSelectorOpen(false);
          setVoiceoverTargetTrackId(audioSelectorTargetTrack?.id);
          setIsVoiceoverModalOpen(true);
        }}
      />

      {/* Studio Master Export & Download Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        mediaType={mediaType}
        projectTitle={projectTitle}
        projectId={projectId}
        imageSrc={imageSrc}
        videoSrc={videoSrc}
        adjustments={adjustments}
        rotation={rotation}
        flipH={flipH}
        flipV={flipV}
        layers={layers}
        videoState={videoState}
      />

      {/* In-App Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Workspace;
