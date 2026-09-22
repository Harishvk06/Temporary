import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Sparkles,
  Zap,
  Sliders,
  Image as ImageIcon,
  Film,
  Upload
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ProjectCard } from '../components/ProjectCard';
import { UploadArea } from '../components/UploadArea';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Project } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { readFileAsDataURL, createMediaObjectUrl, generateVideoThumbnail } from '../utils/fileHelpers';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { projects, addProject, deleteProject, loadUserProjects } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (user?.id) {
      loadUserProjects(user.id);
    }
  }, [user?.id, loadUserProjects]);

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
  };

  const handleUploadFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const isVideo = file.type.startsWith('video');
      let mediaUrl: string;
      let thumbnailUrl: string;

      if (isVideo) {
        mediaUrl = createMediaObjectUrl(file);
        thumbnailUrl = await generateVideoThumbnail(file);
      } else {
        mediaUrl = await readFileAsDataURL(file);
        thumbnailUrl = mediaUrl;
      }

      const newProj: Project = {
        id: `proj-${Date.now()}`,
        user_id: user?.id || 'user-1',
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: `Uploaded ${file.name}`,
        type: isVideo ? 'video' : 'image',
        thumbnail_url: thumbnailUrl,
        media_url: mediaUrl,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_edited_at: 'Just now'
      };

      addProject(newProj);
      setIsUploadOpen(false);

      if (isVideo) {
        navigate(`/workspace?id=${newProj.id}&type=video`);
      } else {
        navigate(`/workspace?id=${newProj.id}&type=image`);
      }
    } catch (err) {
      console.error('Failed to read uploaded file:', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex flex-col">
      <Navbar />

      <main className="pt-28 pb-16 px-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#dee1f9]">
              Welcome back, <span className="gradient-text">{user?.full_name || 'Creator'}</span>!
            </h1>
            <p className="text-sm text-[#c7c4d8]/80 mt-1">
              Manage your projects or kickstart a new AI editing session.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="gradient-btn px-5 py-2.5 text-sm flex items-center gap-2 shadow-aura-glow"
            >
              <Plus className="w-4 h-4 text-[#080c18]" />
              New Project
            </button>
          </div>
        </div>

        {/* Stats Cards (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Edits */}
          <div className="glass-card p-6 flex items-center justify-between border border-[rgba(248,250,252,0.08)]">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#c7c4d8]/60">Total Edits</span>
              <span className="text-3xl font-extrabold text-[#dee1f9]">42</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#c4c0ff]/10 border border-[#c4c0ff]/30 flex items-center justify-center text-[#c4c0ff]">
              <Sliders className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Credits Used */}
          <div className="glass-card p-6 flex items-center justify-between border border-[rgba(248,250,252,0.08)]">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#c7c4d8]/60">Credits Used</span>
              <span className="text-3xl font-extrabold text-[#dee1f9]">58</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Credits Remaining (Highlighted in Cyan) */}
          <div className="glass-card p-6 flex items-center justify-between border border-[#2fd9f4]/40 shadow-aura-glow bg-gradient-to-tr from-[#0e1323] to-[#2fd9f4]/10">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2fd9f4]">Credits Remaining</span>
              <span className="text-3xl font-extrabold text-[#2fd9f4]">
                {user?.credits_remaining || 942}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#2fd9f4]/20 border border-[#2fd9f4]/50 flex items-center justify-center text-[#2fd9f4]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#c7c4d8]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-[#080c18] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50 transition-colors"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filterType === 'all'
                  ? 'bg-gradient-to-r from-[#c4c0ff]/20 to-[#2fd9f4]/20 border border-[#2fd9f4]/40 text-[#2fd9f4]'
                  : 'glass-panel text-[#c7c4d8] hover:text-[#dee1f9]'
                }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${filterType === 'image'
                  ? 'bg-gradient-to-r from-[#c4c0ff]/20 to-[#2fd9f4]/20 border border-[#2fd9f4]/40 text-[#2fd9f4]'
                  : 'glass-panel text-[#c7c4d8] hover:text-[#dee1f9]'
                }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#c4c0ff]" />
              Images
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${filterType === 'video'
                  ? 'bg-gradient-to-r from-[#c4c0ff]/20 to-[#2fd9f4]/20 border border-[#2fd9f4]/40 text-[#2fd9f4]'
                  : 'glass-panel text-[#c7c4d8] hover:text-[#dee1f9]'
                }`}
            >
              <Film className="w-3.5 h-3.5 text-[#2fd9f4]" />
              Videos
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center flex flex-col items-center gap-3">
            <p className="text-base text-[#c7c4d8]">No projects match your filter query.</p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="text-xs text-[#2fd9f4] hover:underline font-semibold"
            >
              Upload media to create a project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
            ))}
          </div>
        )}
      </main>

      {/* Upload Media Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Media File">
        <UploadArea onFileSelect={handleUploadFiles} />
      </Modal>
    </div>
  );
};
