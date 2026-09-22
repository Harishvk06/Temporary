export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'image' | 'video';
  thumbnail_url?: string;
  media_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  last_edited_at: string;
}
