import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, Film, Edit3, Trash2, Play } from 'lucide-react';
import { Project } from '../types';
import { generateVideoThumbnail } from '../utils/fileHelpers';
import { useProjectStore } from '../store/useProjectStore';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const isVideo = project.type === 'video';
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { updateProject } = useProjectStore();

  const [transformStyle, setTransformStyle] = useState<string>(
    'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0) scale3d(1, 1, 1)'
  );
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [extractedThumbnail, setExtractedThumbnail] = useState<string | null>(null);

  const defaultVideoThumbnail = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&auto=format&fit=crop&q=60';
  const defaultImageThumbnail = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60';

  // Dynamically extract frame from actual video file using canvas
  useEffect(() => {
    if (isVideo) {
      const isDefaultPlaceholder =
        !project.thumbnail_url ||
        project.thumbnail_url.includes('photo-1574717024653') ||
        project.thumbnail_url.includes('unsplash.com');

      const videoSource =
        project.media_url ||
        'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4';

      if (isDefaultPlaceholder && videoSource) {
        generateVideoThumbnail(videoSource).then((frameDataUrl) => {
          if (frameDataUrl && frameDataUrl.startsWith('data:image/')) {
            setExtractedThumbnail(frameDataUrl);
            updateProject(project.id, { thumbnail_url: frameDataUrl });
          }
        });
      }
    }
  }, [project.id, project.type, project.media_url, project.thumbnail_url, updateProject, isVideo]);

  const activeVideoSource =
    project.media_url ||
    'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4';

  const displayThumbnail =
    extractedThumbnail ||
    (project.thumbnail_url && !project.thumbnail_url.includes('photo-1574717024653')
      ? project.thumbnail_url
      : undefined) ||
    (isVideo ? defaultVideoThumbnail : defaultImageThumbnail);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, -6px, 12px) scale3d(1.03, 1.03, 1.03)`
    );
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
    }
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: isHovered
          ? 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
      }}
      className="glass-card overflow-hidden group border border-[rgba(248,250,252,0.08)] hover:border-[#2fd9f4]/40 flex flex-col justify-between transform-gpu-3d hover:shadow-aura-3d active:scale-95"
    >
      {/* Thumbnail Container displaying extracted video frame or image */}
      <div className="relative aspect-video bg-[#060609] overflow-hidden">
        {isVideo && isHovered ? (
          <video
            ref={videoRef}
            src={activeVideoSource}
            preload="auto"
            muted
            loop
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
          />
        ) : (
          <img
            src={displayThumbnail}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}

        {/* Play Icon Overlay for Videos */}
        {isVideo && (
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full glass-panel border border-white/20 flex items-center justify-center text-[#2fd9f4] shadow-aura-glow group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-[#2fd9f4] ml-0.5" />
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-3 left-3 glass-panel px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 text-[#dee1f9]">
          {isVideo ? (
            <Film className="w-3.5 h-3.5 text-[#2fd9f4]" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-[#c4c0ff]" />
          )}
          {isVideo ? 'Video' : 'Image'}
        </div>
      </div>

      {/* Content Meta */}
      <div className="p-4 flex flex-col gap-2 bg-gradient-to-b from-[#0a0e1a]/80 to-[#060609]">
        <h3 className="font-bold text-base text-[#dee1f9] group-hover:text-[#2fd9f4] transition-colors truncate">
          {project.name}
        </h3>
        <p className="text-xs text-[#c7c4d8]/70 line-clamp-1">
          {project.description || 'AI assisted creative project'}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-[11px] font-mono text-[#c7c4d8]/60">
            Edited {project.last_edited_at}
          </span>

          <div className="flex items-center gap-2">
            <Link
              to={`/workspace?id=${project.id}&type=${project.type}`}
              className="p-2 glass-panel rounded-lg text-[#dee1f9] hover:text-[#2fd9f4] hover:border-[#2fd9f4]/40 transition-colors active:scale-95"
              title="Open in Workspace"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => onDelete(project.id)}
              className="p-2 glass-panel rounded-lg text-red-400 hover:bg-red-500/10 transition-colors active:scale-95"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
