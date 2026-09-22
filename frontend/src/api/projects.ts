import { apiClient } from './client';
import { Project } from '../types';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects');
    return res.data;
  },
  create: async (data: { name: string; type: 'image' | 'video'; description?: string }): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects', data);
    return res.data;
  },
  getById: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/projects/${id}`);
    return res.data;
  },
};
