import { apiClient } from './client';
import { VideoMedia } from '../types';

export const videosApi = {
  upload: async (projectId: string, file: File): Promise<VideoMedia> => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file);
    const res = await apiClient.post<VideoMedia>('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  trim: async (videoId: string, startTime: number, endTime: number): Promise<{ result_url: string }> => {
    const res = await apiClient.post<{ result_url: string }>(`/videos/${videoId}/trim`, {
      start_time: startTime,
      end_time: endTime,
    });
    return res.data;
  },
  exportVideo: async (
    videoId: string,
    format: string = 'mp4'
  ): Promise<{ success: boolean; export_url: string; download_url?: string; filename?: string; file_size?: number }> => {
    const res = await apiClient.post<{ success: boolean; export_url: string; download_url?: string; filename?: string; file_size?: number }>(
      `/videos/${videoId}/export?format=${format}`
    );
    return res.data;
  },
  exportDirectVideo: async (payload: {
    video_id?: string;
    project_id?: string;
    video_url?: string;
    format: string;
    resolution?: string;
    fps?: number;
    include_audio?: boolean;
    title?: string;
  }): Promise<{ success: boolean; export_url: string; download_url?: string; filename: string; file_size?: number }> => {
    const res = await apiClient.post<{ success: boolean; export_url: string; download_url?: string; filename: string; file_size?: number }>(
      '/videos/export',
      payload
    );
    return res.data;
  },
};
