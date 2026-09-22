export interface ImageMedia {
  id: string;
  project_id: string;
  user_id: string;
  filename: string;
  original_filename?: string;
  file_size?: number;
  width?: number;
  height?: number;
  format?: string;
  s3_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  exposure?: number;
  filter?: string;
  depthDisplacement?: number;
  parallaxTilt?: number;
  hologramScan?: boolean | number;
  particleDensity?: number;
  particleType?: string;
  volumetricLighting?: boolean | number;
  lightColor1?: string;
  lightColor2?: string;
  selected3DObject?: string;
}


