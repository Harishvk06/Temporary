export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  profile_picture_url?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  credits_remaining: number;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserStats {
  total_edits: number;
  credits_used: number;
  credits_remaining: number;
}
