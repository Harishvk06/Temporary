export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface AIProcessResponse {
  job_id: string;
  status: string;
  message: string;
  planned_steps?: Array<{
    step: {
      tool?: string;
      description?: string;
    };
    status: string;
  }>;
  result_url?: string;
  confidence?: number;
}
