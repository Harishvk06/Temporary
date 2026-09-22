import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Film } from 'lucide-react';

interface UploadAreaProps {
  onFileSelect: (files: File[]) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelect }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`glass-panel p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 text-center ${
        isDragActive
          ? 'border-[#2fd9f4] bg-[#2fd9f4]/10 shadow-aura-glow scale-[1.01]'
          : 'border-white/10 hover:border-[#2fd9f4]/40 hover:bg-white/5'
      }`}
    >
      <input {...getInputProps()} />

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#c4c0ff]/20 to-[#2fd9f4]/20 flex items-center justify-center text-[#2fd9f4] shadow-aura-glow">
        <Upload className="w-8 h-8 animate-bounce" />
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-base font-bold text-[#dee1f9]">
          {isDragActive ? 'Drop your media file here' : 'Drag files here or click to upload'}
        </h4>
        <p className="text-xs text-[#c7c4d8]">
          Supports high-resolution images & videos (MP4, MOV, WebM, AVI, MKV)
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-[#c4c0ff] pt-2">
        <span className="flex items-center gap-1.5">
          <FileImage className="w-3.5 h-3.5 text-[#2fd9f4]" />
          JPG, PNG, WebP, GIF
        </span>
        <span className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-[#c4c0ff]" />
          MP4, MOV, MKV, WebM
        </span>
      </div>
    </div>
  );
};
