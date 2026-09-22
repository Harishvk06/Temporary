import React, { useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { ImageAdjustments, VideoClip, VideoState } from '../types';

interface PreviewPaneProps {
  videoSrc?: string;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  onPlayPause?: () => void;
  currentTime: number;
  duration?: number;
  volume: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onVolumeChange: (vol: number) => void;
  onDurationChange?: (dur: number) => void;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  adjustments?: ImageAdjustments;
  filterStyle?: string;
  playbackRate?: number;
  activeTextOverlays?: string[];
  audioClips?: VideoClip[];
  videoClips?: VideoClip[];
  videoState?: VideoState;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  videoSrc = 'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
  isPlaying,
  onTogglePlay,
  onPlayPause,
  currentTime,
  duration = 30.0,
  volume,
  isMuted = false,
  onToggleMute,
  onVolumeChange,
  onDurationChange,
  onTimeUpdate,
  onEnded,
  onSkipBack,
  onSkipForward,
  adjustments,
  filterStyle: customFilterStyle,
  playbackRate = 1.0,
  activeTextOverlays = [],
  audioClips = [],
  videoClips,
  videoState,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioElementsRef = useRef<{ [clipId: string]: HTMLAudioElement }>({});
  const isProgrammaticSeekRef = useRef<boolean>(false);

  /*
   * ------------------------------------------------------------
   * VIDEO CLIPS
   * ------------------------------------------------------------
   */

  const effectiveVideoClips =
    videoClips ||
    (videoState
      ? videoState.tracks
          .filter((t: any) => t.type === 'video')
          .flatMap((t: any) => t.clips || [])
      : []);

  /*
   * ------------------------------------------------------------
   * AUDIO CLIPS (FROM PROPS OR MULTI-TRACK VIDEO STATE)
   * ------------------------------------------------------------
   */

  const effectiveAudioClips: (VideoClip & { trackMuted?: boolean; trackVolume?: number })[] =
    audioClips && audioClips.length > 0
      ? audioClips.map((c) => ({
          ...c,
          trackMuted: false,
          trackVolume: 100,
        }))
      : (videoState
          ? videoState.tracks.flatMap((t: any) =>
              (t.clips || [])
                .filter(
                  (c: any) =>
                    t.type === 'audio' ||
                    c.type === 'audio' ||
                    c.track === 'audio' ||
                    Boolean(c.audio_url || c.audioUrl || c.mediaUrl || c.url || c.sourceUrl || c.source_url)
                )
                .map((c: any) => ({
                  ...c,
                  trackMuted: Boolean(t.muted),
                  trackVolume: t.volume !== undefined ? t.volume : 100,
                }))
            )
          : []);

  const activeVideoClip = effectiveVideoClips.find((clip: any) => {
    const sTime =
      clip.startTime !== undefined
        ? clip.startTime
        : clip.start_time !== undefined
          ? clip.start_time
          : 0;

    const dur = clip.duration !== undefined ? clip.duration : duration || 4.0;
    const eTime =
      clip.endTime !== undefined
        ? clip.endTime
        : clip.end_time !== undefined
          ? clip.end_time
          : sTime + dur;

    return currentTime >= sTime && currentTime <= eTime;
  });

  /*
   * ------------------------------------------------------------
   * MEDIA PLAYBACK STATE
   * ------------------------------------------------------------
   */

  const getMediaPlaybackState = () => {
    if (effectiveVideoClips.length === 0) {
      return {
        mediaTime: currentTime,
        activeSrc: videoSrc,
        isBlank: !videoSrc,
      };
    }

    if (!activeVideoClip) {
      // If we have videoSrc available, play it without blanking
      return {
        mediaTime: currentTime,
        activeSrc: videoSrc,
        isBlank: !videoSrc,
      };
    }

    const sTime =
      activeVideoClip.startTime !== undefined
        ? activeVideoClip.startTime
        : activeVideoClip.start_time !== undefined
          ? activeVideoClip.start_time
          : 0;

    const srcStart =
      activeVideoClip.sourceStartTime !== undefined
        ? activeVideoClip.sourceStartTime
        : sTime;

    const clipOffset = Math.max(0, currentTime - sTime);
    const calculatedMediaTime = srcStart + clipOffset;

    let clipSrc =
      activeVideoClip.sourceUrl ||
      activeVideoClip.source_url ||
      activeVideoClip.mediaUrl ||
      activeVideoClip.media_url ||
      activeVideoClip.url ||
      videoSrc;

    if (
      videoSrc &&
      (videoSrc.startsWith('blob:') ||
        videoSrc.startsWith('data:video'))
    ) {
      clipSrc = videoSrc;
    }

    return {
      mediaTime: calculatedMediaTime,
      activeSrc: clipSrc || videoSrc,
      isBlank: !clipSrc && !videoSrc,
    };
  };

  const { mediaTime, activeSrc, isBlank } = getMediaPlaybackState();

  /*
   * ------------------------------------------------------------
   * MEDIA TIME → TIMELINE TIME
   * ------------------------------------------------------------
   */

  const calculateTimelineTimeFromMediaTime = (
    mediaT: number
  ): number => {
    if (
      effectiveVideoClips.length <= 1 &&
      (!activeVideoClip || activeVideoClip.startTime === 0)
    ) {
      return mediaT;
    }

    if (!activeVideoClip) {
      return currentTime;
    }

    const sTime =
      activeVideoClip.startTime !== undefined
        ? activeVideoClip.startTime
        : activeVideoClip.start_time !== undefined
          ? activeVideoClip.start_time
          : 0;

    const srcStart =
      activeVideoClip.sourceStartTime !== undefined
        ? activeVideoClip.sourceStartTime
        : sTime;

    const clipOffset = Math.max(0, mediaT - srcStart);

    return Math.round((sTime + clipOffset) * 100) / 100;
  };

  /*
   * ------------------------------------------------------------
   * SYNC VIDEO SOURCE + POSITION
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video || isBlank) {
      return;
    }

    if (
      activeSrc &&
      video.src !== activeSrc &&
      !video.src.endsWith(activeSrc)
    ) {
      video.src = activeSrc;
      video.load();
    }

    if (Math.abs(video.currentTime - mediaTime) > 0.3) {
      isProgrammaticSeekRef.current = true;

      try {
        video.currentTime = mediaTime;
      } catch {
        // Ignore invalid seek while metadata is loading.
      }

      const timer = setTimeout(() => {
        isProgrammaticSeekRef.current = false;
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [mediaTime, activeSrc, isBlank]);

  /*
   * ------------------------------------------------------------
   * FIX: SYNC ACTUAL VIDEO PLAYBACK SPEED
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const safeRate =
      Number.isFinite(playbackRate) && playbackRate > 0
        ? playbackRate
        : 1.0;

    if (video.playbackRate !== safeRate) {
      video.playbackRate = safeRate;
    }

    if (video.defaultPlaybackRate !== safeRate) {
      video.defaultPlaybackRate = safeRate;
    }
  }, [playbackRate, activeSrc]);

  /*
   * ------------------------------------------------------------
   * SYNC PLAY / PAUSE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (isPlaying && !isBlank) {
      video.play().catch((err) => {
        console.warn('Autoplay error:', err);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, isBlank, videoSrc, activeSrc]);

  /*
   * ------------------------------------------------------------
   * SYNC VIDEO VOLUME & MUTE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (videoRef.current) {
      const masterNorm = isMuted ? 0 : (volume <= 1 ? Math.max(0, volume) : Math.max(0, Math.min(1, volume / 100)));
      videoRef.current.volume = masterNorm;
      videoRef.current.muted = isMuted || masterNorm === 0;
    }
  }, [volume, isMuted]);

  /*
   * ------------------------------------------------------------
   * SYNC VIDEO METADATA
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const handleMeta = () => {
      const dur = video.duration;

      if (
        dur &&
        !isNaN(dur) &&
        isFinite(dur) &&
        dur > 0 &&
        onDurationChange
      ) {
        onDurationChange(dur);
      }
    };

    if (video.readyState >= 1) {
      handleMeta();
    }

    video.addEventListener('loadedmetadata', handleMeta);
    video.addEventListener('durationchange', handleMeta);
    video.addEventListener('canplay', handleMeta);

    return () => {
      video.removeEventListener('loadedmetadata', handleMeta);
      video.removeEventListener('durationchange', handleMeta);
      video.removeEventListener('canplay', handleMeta);
    };
  }, [videoSrc, activeSrc, onDurationChange]);

  /*
   * ------------------------------------------------------------
   * FALLBACK PLAYBACK TICKER FOR IMAGE / AUDIO-ONLY TIMELINES
   * ------------------------------------------------------------
   */
  const lastTickTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const isImageOrBlank =
      isBlank ||
      videoSrc.startsWith('data:image/') ||
      Boolean(videoSrc.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) ||
      !videoRef.current;

    if (!isPlaying || !isImageOrBlank) {
      lastTickTimeRef.current = performance.now();
      return;
    }

    lastTickTimeRef.current = performance.now();
    let animId: number;

    const tick = () => {
      const now = performance.now();
      const deltaSec = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      const safeRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1.0;
      const nextTime = currentTime + deltaSec * safeRate;

      if (nextTime >= duration) {
        if (onTimeUpdate) {
          onTimeUpdate(duration);
        }
        if (onPlayPause) {
          onPlayPause();
        } else if (onTogglePlay) {
          onTogglePlay();
        }
        if (onEnded) {
          onEnded();
        }
      } else {
        if (onTimeUpdate) {
          onTimeUpdate(Math.round(nextTime * 100) / 100);
        }
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isBlank,
    videoSrc,
    onTimeUpdate,
    onPlayPause,
    onTogglePlay,
    onEnded,
  ]);

  /*
   * ------------------------------------------------------------
   * SYNCHRONIZED MULTI-TRACK AUDIO ENGINE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const validAudioClips = effectiveAudioClips.filter((c) => {
      const url =
        c.audio_url ||
        (c as any).audioUrl ||
        (c as any).mediaUrl ||
        (c as any).url ||
        (c as any).sourceUrl ||
        (c as any).source_url;
      return Boolean(url) && !c.muted && !(c as any).trackMuted && !isMuted;
    });

    validAudioClips.forEach((clip) => {
      const clipUrl =
        clip.audio_url ||
        (clip as any).audioUrl ||
        (clip as any).mediaUrl ||
        (clip as any).url ||
        (clip as any).sourceUrl ||
        (clip as any).source_url ||
        '';

      let audioEl = audioElementsRef.current[clip.id];

      if (!audioEl) {
        audioEl = new Audio();
        audioEl.preload = 'auto';
        audioEl.src = clipUrl;
        audioElementsRef.current[clip.id] = audioEl;
      } else if (audioEl.src !== clipUrl && !audioEl.src.endsWith(clipUrl)) {
        audioEl.src = clipUrl;
        audioEl.load();
      }

      const sTime =
        (clip as any).startTime !== undefined
          ? (clip as any).startTime
          : clip.start_time !== undefined
            ? clip.start_time
            : 0;

      const dur =
        (clip as any).duration !== undefined
          ? (clip as any).duration
          : (clip as any).sourceEndTime
            ? (clip as any).sourceEndTime - ((clip as any).sourceStartTime || 0)
            : undefined;

      const eTime =
        (clip as any).endTime !== undefined
          ? (clip as any).endTime
          : clip.end_time !== undefined
            ? clip.end_time
            : dur !== undefined
              ? sTime + dur
              : sTime + 30;

      const srcStart =
        (clip as any).sourceStartTime !== undefined
          ? (clip as any).sourceStartTime
          : (clip as any).source_start_time !== undefined
            ? (clip as any).source_start_time
            : 0;

      const isClipActive = currentTime >= sTime && currentTime < eTime;
      const clipOffset = Math.max(0, currentTime - sTime) + srcStart;

      // Master volume (0 to 1)
      const masterVolumeNorm = isMuted
        ? 0
        : volume <= 1
          ? Math.max(0, volume)
          : Math.max(0, Math.min(1, volume / 100));

      // Track volume (0 to 1)
      const trackVolRaw = (clip as any).trackVolume;
      const trackVolumeNorm = (clip as any).trackMuted
        ? 0
        : trackVolRaw !== undefined
          ? trackVolRaw <= 1
            ? Math.max(0, trackVolRaw)
            : Math.max(0, Math.min(1, trackVolRaw / 100))
          : 1.0;

      // Clip volume (0 to 1)
      const clipVolRaw = clip.volume;
      const clipVolumeNorm = clip.muted
        ? 0
        : clipVolRaw !== undefined
          ? clipVolRaw <= 1
            ? Math.max(0, clipVolRaw)
            : Math.max(0, Math.min(1, clipVolRaw / 100))
          : 1.0;

      const finalGain = masterVolumeNorm * trackVolumeNorm * clipVolumeNorm;
      audioEl.volume = Math.max(0, Math.min(1, finalGain));

      const safeRate =
        Number.isFinite(playbackRate) && playbackRate > 0
          ? playbackRate
          : 1.0;

      if (audioEl.playbackRate !== safeRate) {
        audioEl.playbackRate = safeRate;
      }

      if (isPlaying && isClipActive && finalGain > 0) {
        // Sync position if drifted
        if (audioEl.readyState >= 1) {
          if (Math.abs(audioEl.currentTime - clipOffset) > 0.25) {
            try {
              audioEl.currentTime = clipOffset;
            } catch (seekErr) {
              // ignore seek exception
            }
          }
        } else {
          // If metadata not ready yet, sync on canplay
          const onCanPlay = () => {
            try {
              audioEl.currentTime = clipOffset;
            } catch {}
            if (isPlaying && isClipActive && audioEl.paused) {
              audioEl.play().catch(console.warn);
            }
            audioEl.removeEventListener('canplay', onCanPlay);
          };
          audioEl.addEventListener('canplay', onCanPlay);
        }

        if (audioEl.paused) {
          audioEl
            .play()
            .catch((err) =>
              console.warn('Audio clip playback failed:', err)
            );
        }
      } else {
        if (!audioEl.paused) {
          audioEl.pause();
        }
      }
    });

    /*
     * Cleanup deleted or muted audio clips
     */
    Object.keys(audioElementsRef.current).forEach((clipId) => {
      if (!validAudioClips.some((c) => c.id === clipId)) {
        const el = audioElementsRef.current[clipId];
        if (el) {
          el.pause();
        }
        delete audioElementsRef.current[clipId];
      }
    });
  }, [
    isPlaying,
    currentTime,
    volume,
    isMuted,
    playbackRate,
    effectiveAudioClips,
  ]);

  // Clean up all audio elements on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElementsRef.current).forEach((el) => {
        try {
          el.pause();
          el.src = '';
        } catch {}
      });
      audioElementsRef.current = {};
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * COLOR / IMAGE FILTER
   * ------------------------------------------------------------
   */

  const computeFilterStyle = (): string => {
    /*
     * Only use a custom filter when one is actually supplied.
     */
    if (customFilterStyle) {
      return customFilterStyle;
    }

    if (!adjustments) {
      return 'none';
    }

    const {
      brightness = 0,
      contrast = 0,
      saturation = 0,
      temperature = 0,
      filter = 'none',
    } = adjustments;

    let presetFilter = '';

    const norm = (filter || 'none').toLowerCase();

    if (
      norm === 'vintage' ||
      norm === 'warm vintage'
    ) {
      presetFilter =
        'sepia(45%) hue-rotate(-15deg) contrast(115%) saturate(120%)';
    } else if (
      norm === 'blur' ||
      norm === 'soft blur'
    ) {
      presetFilter = 'blur(4px)';
    } else if (
      norm === 'sharpen' ||
      norm === 'ultra sharpen'
    ) {
      presetFilter =
        'contrast(140%) saturate(135%) brightness(105%)';
    }

    let tempFilter = '';

    if (temperature > 0) {
      tempFilter =
        `sepia(${temperature * 0.35}%) ` +
        `hue-rotate(${-temperature * 0.1}deg)`;
    } else if (temperature < 0) {
      tempFilter =
        `hue-rotate(${temperature * 0.4}deg)`;
    }

    const baseFilter =
      `brightness(${100 + brightness}%) ` +
      `contrast(${100 + contrast}%) ` +
      `saturate(${100 + saturation}%)`;

    const combined = [
      presetFilter,
      tempFilter,
      baseFilter,
    ]
      .filter(Boolean)
      .join(' ');

    return combined || 'none';
  };

  const computedFilterStyle = computeFilterStyle();

  /*
   * ------------------------------------------------------------
   * FULLSCREEN
   * ------------------------------------------------------------
   */

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div className="relative flex-1 bg-[#080c18] border border-[rgba(248,250,252,0.08)] rounded-2xl overflow-hidden flex flex-col justify-between p-4 shadow-aura-card min-h-0 h-full">

      {/* Upper Media Player Canvas Area */}
      <div
        className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black flex items-center justify-center group"
        data-testid="main-image-track-container"
      >

        {videoSrc.startsWith('data:image/') ||
        videoSrc.match(
          /\.(jpeg|jpg|gif|png|webp)($|\?)/i
        ) ? (
          <img
            src={videoSrc}
            alt="Media Preview"
            data-testid="main-image-track-media"
            data-filter-preset={
              adjustments?.filter || 'none'
            }
            data-computed-filter={computedFilterStyle}
            className="max-h-full max-w-full object-contain transition-all duration-300"
            style={{
              filter: computedFilterStyle,
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src={activeSrc}
            data-testid="main-image-track-media"
            data-filter-preset={
              adjustments?.filter || 'none'
            }
            data-computed-filter={computedFilterStyle}
            className={`max-h-full max-w-full object-contain transition-all duration-300 ${
              isBlank
                ? 'opacity-0'
                : 'opacity-100'
            }`}
            style={{
              filter: computedFilterStyle,
            }}
            controls={false}
            playsInline
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;

              /*
               * Re-apply selected playback speed whenever
               * video metadata loads / source changes.
               */
              const safeRate =
                Number.isFinite(playbackRate) &&
                playbackRate > 0
                  ? playbackRate
                  : 1.0;

              video.playbackRate = safeRate;
              video.defaultPlaybackRate = safeRate;

              const dur = video.duration;

              if (
                dur &&
                !isNaN(dur) &&
                onDurationChange
              ) {
                onDurationChange(dur);
              }
            }}
            onTimeUpdate={(e) => {
              if (
                !onTimeUpdate ||
                !isPlaying ||
                isProgrammaticSeekRef.current
              ) {
                return;
              }

              const rawMediaTime =
                e.currentTarget.currentTime;

              const computedTimelineTime =
                calculateTimelineTimeFromMediaTime(
                  rawMediaTime
                );

              const eTime = activeVideoClip
                ? activeVideoClip.endTime !== undefined
                  ? activeVideoClip.endTime
                  : activeVideoClip.end_time !== undefined
                    ? activeVideoClip.end_time
                    : duration
                : duration;

              /*
               * Check whether active clip has ended.
               */
              if (
                activeVideoClip &&
                computedTimelineTime >= eTime - 0.05
              ) {
                const nextClip =
                  effectiveVideoClips.find((c: any) => {
                    const nextStart =
                      c.startTime !== undefined
                        ? c.startTime
                        : c.start_time !== undefined
                          ? c.start_time
                          : 0;

                    return nextStart >= eTime;
                  });

                if (nextClip) {
                  const nextStart =
                    nextClip.startTime !== undefined
                      ? nextClip.startTime
                      : nextClip.start_time !== undefined
                        ? nextClip.start_time
                        : 0;

                  onTimeUpdate(nextStart);
                } else {
                  if (onPlayPause) {
                    onPlayPause();
                  } else if (onTogglePlay) {
                    onTogglePlay();
                  }

                  onTimeUpdate(eTime);
                }
              } else {
                onTimeUpdate(
                  computedTimelineTime
                );
              }
            }}
            onEnded={() => {
              if (onEnded) {
                onEnded();
              }
            }}
          />
        )}

        {/* Text Overlay Renderer */}
        {activeTextOverlays.length > 0 && (
          <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-2 pointer-events-none z-20">
            {activeTextOverlays.map((text, i) => (
              <div
                key={i}
                className="bg-black/60 backdrop-blur-sm text-white font-bold px-4 py-2 rounded-lg text-lg md:text-xl border border-white/20 shadow-2xl drop-shadow-md text-center max-w-[80%]"
              >
                {text}
              </div>
            ))}
          </div>
        )}

        {/* Video Overlay Info Badge */}
        <div className="absolute top-4 right-4 glass-panel px-3 py-1 rounded-full text-xs font-mono text-[#2fd9f4] border border-[#2fd9f4]/30 z-20 flex items-center gap-2 shadow-aura-glow">
          <span className="font-bold text-emerald-400">
            ⚡ 60 FPS Motion Interpolation
          </span>

          <span>•</span>

          <span>
            {playbackRate}x Speed
          </span>

          <span>•</span>

          <span className="text-[#c4c0ff] uppercase">
            {adjustments?.filter !== 'none'
              ? adjustments?.filter
              : '4K Raw'}
          </span>
        </div>
      </div>

      {/* Media Player Control Bar */}
      <div className="mt-3 glass-panel p-3 rounded-xl flex items-center justify-between gap-4 flex-shrink-0">

        {/* Left Playback Buttons */}
        <div className="flex items-center gap-3">

          <button
            onClick={() => {
              if (onPlayPause) {
                onPlayPause();
              } else if (onTogglePlay) {
                onTogglePlay();
              }
            }}
            className="w-10 h-10 rounded-full gradient-btn flex items-center justify-center shadow-aura-glow hover:scale-105 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-[#080c18]" />
            ) : (
              <Play className="w-5 h-5 text-[#080c18] ml-0.5" />
            )}
          </button>

          <button
            onClick={onSkipBack}
            className="p-2 text-[#c7c4d8] hover:text-[#2fd9f4] transition-colors"
            title="Rewind 5s"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onSkipForward}
            className="p-2 text-[#c7c4d8] hover:text-[#2fd9f4] transition-colors"
            title="Forward 5s"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium text-[#dee1f9]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Right Volume & Fullscreen Controls */}
        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2">

            <button
              onClick={() =>
                onVolumeChange(
                  volume === 0 ? 100 : 0
                )
              }
              className="text-[#c7c4d8] hover:text-[#2fd9f4]"
              title={
                volume === 0
                  ? 'Unmute'
                  : 'Mute'
              }
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) =>
                onVolumeChange(
                  Number(e.target.value)
                )
              }
              className="w-20 accent-[#2fd9f4] h-1 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={handleFullscreen}
            className="p-2 text-[#c7c4d8] hover:text-[#2fd9f4] transition-colors"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>

        </div>
      </div>
    </div>
  );
};