export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

export const THEME_COLORS = {
  primary: '#c4c0ff',
  secondary: '#2fd9f4',
  accent: '#dee1f9',
  dark: '#0e1323',
  darker: '#080c18',
};

export const MOCK_PROJECTS = [
  {
    id: 'proj-1',
    user_id: 'user-1',
    name: 'Cyberpunk Portrait Edit',
    description: 'AI color grade and neon glow enhancement',
    type: 'image' as const,
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    is_public: true,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-05T14:20:00Z',
    last_edited_at: '2 minutes ago'
  },
  {
    id: 'proj-2',
    user_id: 'user-1',
    name: 'Cinematic Travel Reel',
    description: '1080p 60fps slow-mo color pass',
    type: 'video' as const,
    thumbnail_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&auto=format&fit=crop&q=60',
    is_public: false,
    created_at: '2026-08-02T12:00:00Z',
    updated_at: '2026-08-06T09:10:00Z',
    last_edited_at: '1 hour ago'
  },
  {
    id: 'proj-3',
    user_id: 'user-1',
    name: 'Studio Product Shot',
    description: 'Background removal and specular lighting',
    type: 'image' as const,
    thumbnail_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60',
    is_public: true,
    created_at: '2026-08-04T15:30:00Z',
    updated_at: '2026-08-06T11:00:00Z',
    last_edited_at: 'Yesterday'
  }
];
