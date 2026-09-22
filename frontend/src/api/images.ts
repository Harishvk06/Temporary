import { apiClient } from './client';
import { ImageMedia, ImageAdjustments } from '../types';

export const imagesApi = {
  upload: async (projectId: string, file: File): Promise<ImageMedia> => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file);
    const res = await apiClient.post<ImageMedia>('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  applyEdit: async (imageId: string, editType: string, parameters: ImageAdjustments): Promise<{ result_url: string }> => {
    const res = await apiClient.post<{ result_url: string }>(`/images/${imageId}/edit`, {
      edit_type: editType,
      parameters,
    });
    return res.data;
  },
  exportImage: async (
    imageId: string,
    format: string = 'png'
  ): Promise<{ success: boolean; export_url: string; download_url?: string; filename?: string; file_size?: number }> => {
    const res = await apiClient.post<{ success: boolean; export_url: string; download_url?: string; filename?: string; file_size?: number }>(
      `/images/${imageId}/export?format=${format}`
    );
    return res.data;
  },
  exportDirectImage: async (payload: {
    image_data?: string;
    image_id?: string;
    project_id?: string;
    format: string;
    quality?: number;
    width?: number;
    height?: number;
    title?: string;
  }): Promise<{ success: boolean; export_url: string; download_url?: string; filename: string; file_size?: number }> => {
    const res = await apiClient.post<{ success: boolean; export_url: string; download_url?: string; filename: string; file_size?: number }>(
      '/images/export',
      payload
    );
    return res.data;
  },
};
