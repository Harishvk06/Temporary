import { apiClient } from './client';
import { AIProcessResponse } from '../types';

export const aiApi = {
  process: async (mediaId: string, mediaType: 'image' | 'video', prompt: string): Promise<AIProcessResponse> => {
    const res = await apiClient.post<AIProcessResponse>('/ai/process', {
      media_id: mediaId,
      media_type: mediaType,
      prompt,
    });
    return res.data;
  },

  getSuggestions: async (mediaId: string, mediaType: 'image' | 'video' = 'image'): Promise<{ suggestions: string[] }> => {
    const res = await apiClient.get<{ suggestions: string[] }>(`/ai/suggest/${mediaId}?media_type=${mediaType}`);
    return res.data;
  },

  getJobStatus: async (jobId: string): Promise<any> => {
    const res = await apiClient.get<any>(`/ai/jobs/${jobId}`);
    return res.data;
  },

  cancelJob: async (jobId: string): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post<{ status: string; message: string }>(`/ai/jobs/${jobId}/cancel`);
    return res.data;
  },

  generativeFill: async (formData: FormData): Promise<{ status: string; message: string; result_url: string; prompt: string }> => {
    const res = await apiClient.post<{ status: string; message: string; result_url: string; prompt: string }>(
      '/ai/generative-fill',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000, // 90s timeout for heavy generative fill image synthesis
      }
    );
    return res.data;
  },

  imageToVideo: async (formData: FormData): Promise<{
    status: string;
    job_id: string;
    message: string;
    video_url: string;
    thumbnail_url?: string;
    result_url?: string;
    duration: number;
    motion_style: string;
    prompt: string;
  }> => {
    const res = await apiClient.post<{
      status: string;
      job_id: string;
      message: string;
      video_url: string;
      thumbnail_url?: string;
      result_url?: string;
      duration: number;
      motion_style: string;
      prompt: string;
    }>(
      '/ai/image-to-video',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 120s timeout for video generation
      }
    );
    return res.data;
  },

  chat: async (data: {
    message: string;
    session_id?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    history?: any[];
  }): Promise<{
    session_id: string;
    message: string;
    intent: string;
    needs_clarification: boolean;
    clarifying_questions?: { id: string; category: string; question: string; options: string[] }[];
    action_chips?: string[];
    execution_ready: boolean;
    execution_payload?: any;
    thumbnail_url?: string;
    video_model?: string;
    image_model?: string;
    timestamp?: string;
  }> => {
    const res = await apiClient.post<any>('/ai/chat', data);
    return res.data;
  },
};


