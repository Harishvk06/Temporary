import { create } from 'zustand';
import { Project } from '../types';
import { MOCK_PROJECTS } from '../utils/constants';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  currentUserId: string | null;
  loadUserProjects: (userId: string | null) => void;
  resetProjects: () => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setActiveProjectId: (id: string | null) => void;
  getProjectById: (id: string) => Project | undefined;
}

// In-memory cache for media URLs and thumbnail Data URLs
const sessionMediaCache = new Map<string, { media_url?: string; thumbnail_url?: string }>();

const getInitialUserId = (): string | null => {
  try {
    const saved = localStorage.getItem('aura_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed?.id || null;
    }
  } catch {
    // Ignore error
  }
  return null;
};

const getStorageKey = (userId: string | null) => {
  return userId ? `auraedit_projects_store_${userId}` : null;
};

const loadStoredProjectsForUser = (userId: string | null): Project[] => {
  if (!userId) return [];
  const key = getStorageKey(userId);
  if (!key) return [];

  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: Project) => {
          const cached = sessionMediaCache.get(p.id);
          return {
            ...p,
            user_id: userId,
            media_url: cached?.media_url || p.media_url || p.thumbnail_url,
            thumbnail_url: cached?.thumbnail_url || p.thumbnail_url,
          };
        });
      }
    }
  } catch (e) {
    console.error('Failed to load stored projects:', e);
  }

  // Fallback to user-scoped initial mock projects
  return MOCK_PROJECTS.map((p) => ({ ...p, user_id: userId }));
};

const saveProjectsToStorage = (userId: string | null, projects: Project[]) => {
  const key = getStorageKey(userId);
  if (!key) return;

  // Sync in-memory session cache first
  projects.forEach((p) => {
    const current = sessionMediaCache.get(p.id) || {};
    sessionMediaCache.set(p.id, {
      media_url: p.media_url || current.media_url,
      thumbnail_url: p.thumbnail_url || current.thumbnail_url,
    });
  });

  try {
    localStorage.setItem(key, JSON.stringify(projects));
  } catch (e) {
    console.warn('LocalStorage quota exceeded. Sanitizing payloads for persistent storage...', e);
    try {
      const sanitized = projects.map((p) => ({
        ...p,
        media_url: p.media_url && p.media_url.length > 300000 ? undefined : p.media_url,
        thumbnail_url: p.thumbnail_url && p.thumbnail_url.length > 400000 ? undefined : p.thumbnail_url,
      }));
      localStorage.setItem(key, JSON.stringify(sanitized));
    } catch (err) {
      console.error('Failed to save sanitized projects to storage:', err);
    }
  }
};

const initialUserId = getInitialUserId();

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: loadStoredProjectsForUser(initialUserId),
  activeProjectId: null,
  currentUserId: initialUserId,

  loadUserProjects: (userId: string | null) => {
    if (!userId) {
      sessionMediaCache.clear();
      set({ projects: [], activeProjectId: null, currentUserId: null });
      return;
    }

    const projects = loadStoredProjectsForUser(userId);
    set({ projects, currentUserId: userId });
  },

  resetProjects: () => {
    sessionMediaCache.clear();
    set({ projects: [], activeProjectId: null, currentUserId: null });
  },

  addProject: (project: Project) => {
    sessionMediaCache.set(project.id, {
      media_url: project.media_url,
      thumbnail_url: project.thumbnail_url,
    });
    set((state) => {
      const userId = state.currentUserId || project.user_id;
      const updatedProject = { ...project, user_id: userId };
      const updated = [updatedProject, ...state.projects];
      saveProjectsToStorage(userId, updated);
      return { projects: updated, activeProjectId: project.id, currentUserId: userId };
    });
  },

  deleteProject: (id: string) => {
    sessionMediaCache.delete(id);
    set((state) => {
      const updated = state.projects.filter((p) => p.id !== id);
      saveProjectsToStorage(state.currentUserId, updated);
      return { projects: updated };
    });
  },

  updateProject: (id: string, updates: Partial<Project>) => {
    const current = sessionMediaCache.get(id) || {};
    sessionMediaCache.set(id, {
      media_url: updates.media_url || current.media_url,
      thumbnail_url: updates.thumbnail_url || current.thumbnail_url,
    });
    set((state) => {
      const updated = state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
      saveProjectsToStorage(state.currentUserId, updated);
      return { projects: updated };
    });
  },

  setActiveProjectId: (id: string | null) => set({ activeProjectId: id }),

  getProjectById: (id: string) => {
    const currentUserId = get().currentUserId;
    const found = get().projects.find((p) => p.id === id && (!currentUserId || p.user_id === currentUserId));
    if (found) {
      const cached = sessionMediaCache.get(id);
      if (cached) {
        return {
          ...found,
          media_url: cached.media_url || found.media_url,
          thumbnail_url: cached.thumbnail_url || found.thumbnail_url,
        };
      }
    }
    return found;
  },
}));
