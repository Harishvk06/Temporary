export interface VideoMedia {
  id: string;
  project_id: string;
  user_id: string;
  filename: string;
  original_filename?: string;
  file_size?: number;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  format?: string;
  s3_url?: string;
  thumbnail_url?: string;
  audio_track_count: number;
  created_at: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text';
  muted?: boolean;
  volume?: number; // 0 to 100
}

export interface VideoClip {
  id: string;
  name: string;
  start_time: number;
  end_time: number;
  track: 'video' | 'audio' | 'text';
  track_id?: string;
  color?: string;
  text_content?: string;
  audio_url?: string;
  speed?: number;
  volume?: number;
  muted?: boolean;
}

export interface VideoState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  selectedTrackId: string | null;
  tracks: any[];
  history: any[];
  historyIndex: number;
}

