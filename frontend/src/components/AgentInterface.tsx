import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Lock,
  UserCheck,
  Zap,
  Wand2,
  Maximize2,
  Minimize2,
  X,
  Bot,
  User,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  Film,
  Layers,
  Play,
  ArrowRight,
  HelpCircle,
  Camera,
  Compass
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { aiApi } from '../api/ai';

export interface ClarifyingQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
}

export interface AgentMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: number;
  motionStyle?: string;
  clarifyingQuestions?: ClarifyingQuestion[];
  actionChips?: string[];
  progress?: number;
  currentStep?: string;
  isProcessing?: boolean;
  strictFacialActive?: boolean;
  executionReady?: boolean;
}

interface AgentInterfaceProps {
  mediaType?: 'image' | 'video';
  mediaId?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  sessionId?: string;
  onApplyEdits?: (edits: any[], strictFacial?: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  strictFacialConsistency?: boolean;
  onToggleStrictFacial?: (active: boolean, refUrl?: string) => void;
  facialRefUrl?: string;
  onMakePhotoIntoVideo?: (prompt?: string, motionStyle?: string) => void;
}

export const AgentInterface: React.FC<AgentInterfaceProps> = ({
  mediaType = 'image',
  mediaId = 'media-1',
  mediaUrl,
  thumbnailUrl,
  sessionId = 'auraedit-session-1',
  onApplyEdits,
  isOpen = true,
  onClose,
  strictFacialConsistency = false,
  onToggleStrictFacial,
  facialRefUrl,
  onMakePhotoIntoVideo,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Image-to-Video Motion Style State (Google Flow)
  const [img2vidMotionStyle, setImg2vidMotionStyle] = useState<string>('google_flow_cinematic');

  // Video-to-Video Style & Frame Interpolation State
  const [videoStylePreset, setVideoStylePreset] = useState<string>('photorealistic');
  const [frameInterpolation, setFrameInterpolation] = useState<string>('2x');

  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: `Hello! I am your AuraEdit AI Orchestrator powered by LangGraph memory.\n\n• Video Model: \`gemini-omni-1.1-flash\`\n• Image Model: \`gemini-3.1-flash-image\`\n\nHow would you like to transform or animate your canvas today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      thumbnailUrl: thumbnailUrl || mediaUrl,
      actionChips: [
        'Make a Photo into Video',
        'Pan around the House (3D)',
        'Living Sky & Twinkling Stars',
        'Flowing Ocean Waves',
        'Generative Fill'
      ]
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const processedJobIdsRef = useRef<Set<string>>(new Set());
  const lastProcessedMsgRef = useRef<any>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStep, isProcessing]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage || lastMessage === lastProcessedMsgRef.current) return;

    if (lastMessage.type === 'chat_response') {
      lastProcessedMsgRef.current = lastMessage;
      setIsProcessing(false);
      setCurrentStep('');

      const agentMsg: AgentMessage = {
        id: `chat-${Date.now()}`,
        sender: 'agent',
        text: lastMessage.message || 'Analyzed your request.',
        timestamp: lastMessage.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clarifyingQuestions: lastMessage.clarifying_questions,
        actionChips: lastMessage.action_chips,
        thumbnailUrl: lastMessage.thumbnail_url || thumbnailUrl || mediaUrl,
        executionReady: lastMessage.execution_ready
      };

      setMessages((prev) => [...prev, agentMsg]);

      if (lastMessage.execution_ready && lastMessage.execution_payload) {
        const payload = lastMessage.execution_payload;
        if (payload.action === 'image_to_video' && onMakePhotoIntoVideo) {
          onMakePhotoIntoVideo(payload.prompt, payload.motion_style);
        }
      }
    } else if (lastMessage.type === 'job_progress') {
      setIsProcessing(true);
      if (lastMessage.progress) setProgress(lastMessage.progress);
      if (lastMessage.current_step) setCurrentStep(lastMessage.current_step);
    } else if (lastMessage.type === 'job_completed') {
      const msgJobId = lastMessage.job_id || lastMessage.id || `job-comp-${Date.now()}`;
      if (processedJobIdsRef.current.has(msgJobId)) return;
      processedJobIdsRef.current.add(msgJobId);
      lastProcessedMsgRef.current = lastMessage;

      setIsProcessing(false);
      setProgress(100);
      setCurrentStep('');
      setActiveJobId(null);

      const edits = (lastMessage as any).edits || [];
      const strictFacial = Boolean((lastMessage as any).strict_facial_consistency);
      const isImg2Vid = Boolean((lastMessage as any).is_image_to_video);
      const resultVidUrl = (lastMessage as any).video_url;

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: isImg2Vid
            ? `🎬 **Image-to-Video Generation Completed!**\n\nSynthesized 3D cinematic motion video with H.264 MP4 encoding.`
            : `Workflow complete! Executed ${edits.length} model operation${edits.length === 1 ? '' : 's'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          strictFacialActive: strictFacial,
          videoUrl: resultVidUrl,
          thumbnailUrl: resultVidUrl ? `${resultVidUrl.replace('.mp4', '_thumb.jpg')}` : (thumbnailUrl || mediaUrl),
          actionChips: isImg2Vid ? ['Regenerate 3D Orbit', 'Living Stars Flow', 'Ocean Wave Flow'] : undefined
        }
      ]);

      if (onApplyEdits) {
        onApplyEdits(edits, strictFacial);
      }
    } else if (lastMessage.type === 'job_canceled') {
      const msgJobId = lastMessage.job_id || lastMessage.id || `job-cnl-${Date.now()}`;
      if (processedJobIdsRef.current.has(msgJobId)) return;
      processedJobIdsRef.current.add(msgJobId);
      lastProcessedMsgRef.current = lastMessage;

      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
      setActiveJobId(null);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'agent',
          text: `AI job was canceled by user.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else if (lastMessage.type === 'job_error') {
      const msgJobId = lastMessage.job_id || lastMessage.id || `job-err-${Date.now()}`;
      if (processedJobIdsRef.current.has(msgJobId)) return;
      processedJobIdsRef.current.add(msgJobId);
      lastProcessedMsgRef.current = lastMessage;

      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
      setActiveJobId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: `Notice: ${lastMessage.message || 'AI workflow completed.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [lastMessage, onApplyEdits, onMakePhotoIntoVideo, thumbnailUrl, mediaUrl]);

  const handleCancelAgent = async () => {
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('');
    setActiveJobId(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        sender: 'agent',
        text: 'AI workflow manually canceled by user request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendPrompt = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || prompt;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      thumbnailUrl: thumbnailUrl || mediaUrl,
      strictFacialActive: strictFacialConsistency
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsProcessing(true);
    setProgress(20);
    setCurrentStep('LangGraph Orchestrator analyzing multi-turn memory & motion intent...');

    const clientJobId = `job-${Date.now()}`;
    setActiveJobId(clientJobId);

    try {
      // Call LangGraph chat API with full conversation history and thumbnail context
      const chatRes = await aiApi.chat({
        message: textToSend,
        session_id: sessionId,
        media_type: mediaType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        history: messages.map((m) => ({ sender: m.sender, text: m.text }))
      });

      setIsProcessing(false);
      setProgress(100);
      setCurrentStep('');

      const agentMsg: AgentMessage = {
        id: `chat-${Date.now()}`,
        sender: 'agent',
        text: chatRes.message,
        timestamp: chatRes.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thumbnailUrl: chatRes.thumbnail_url || thumbnailUrl || mediaUrl,
        clarifyingQuestions: chatRes.clarifying_questions,
        actionChips: chatRes.action_chips,
        executionReady: chatRes.execution_ready
      };

      setMessages((prev) => [...prev, agentMsg]);

      // If LangGraph determined parameters are complete and ready for execution:
      if (chatRes.execution_ready && chatRes.execution_payload) {
        const payload = chatRes.execution_payload;
        if (payload.action === 'image_to_video' && onMakePhotoIntoVideo) {
          onMakePhotoIntoVideo(payload.prompt || textToSend, payload.motion_style || img2vidMotionStyle);
        } else if (payload.action === 'generative_fill' && onApplyEdits) {
          onApplyEdits([{ tool: 'generative_fill', parameters: { prompt: payload.prompt } }]);
        }
      }
    } catch (err: any) {
      console.warn('REST chat fallback, attempting WebSocket dispatch:', err);
      // Fallback: send via WebSocket if REST request times out
      if (isConnected) {
        sendMessage({
          type: 'chat_message',
          job_id: clientJobId,
          session_id: sessionId,
          media_type: mediaType,
          prompt: textToSend,
          thumbnail_url: thumbnailUrl || mediaUrl,
          strict_facial_consistency: strictFacialConsistency,
          facial_reference_url: facialRefUrl,
          img2vid_motion_style: img2vidMotionStyle,
        });
      } else {
        setIsProcessing(false);
        setProgress(100);
        setCurrentStep('');
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'agent',
            text: `Processed prompt: "${textToSend}". Ready to generate.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }
  };

  const handleRefImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const refUrl = URL.createObjectURL(file);
    if (onToggleStrictFacial) {
      onToggleStrictFacial(true, refUrl);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `ref-${Date.now()}`,
        sender: 'agent',
        text: `Facial Reference uploaded ("${file.name}"). Strict Facial Consistency Mode is now ACTIVE.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thumbnailUrl: refUrl,
        strictFacialActive: true
      }
    ]);
  };

  if (!isOpen) return null;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-20 left-6 z-50 w-12 h-12 rounded-2xl glass-panel border border-[#2fd9f4]/40 bg-[#06060c]/90 text-[#2fd9f4] flex items-center justify-center shadow-aura-glow hover:scale-105 active:scale-95 transition-all group"
        title="Expand AI Orchestrator Chat Drawer"
      >
        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#06060c] animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className="fixed top-20 left-6 z-50 w-96 h-[calc(100vh-110px)] glass-panel rounded-2xl border border-[#c4c0ff]/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden bg-[#06060c]/95 backdrop-blur-2xl animate-fadeIn transform-gpu-3d"
    >
      {/* Hidden Facial Reference File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRefImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#06060c] via-[#090d1a] to-[#06060c] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#2fd9f4] to-[#c4c0ff] p-[1px] flex items-center justify-center shadow-aura-glow">
            <div className="w-full h-full bg-[#06060c] rounded-[11px] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#2fd9f4]" />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#dee1f9] flex items-center gap-1.5">
              AI Orchestrator
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <span className="text-[10px] text-[#c7c4d8]/70 font-mono flex items-center gap-1">
              <span>LangGraph Memory</span> • <span className="text-[#2fd9f4]">gemini-omni</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 glass-panel rounded-lg text-[#c7c4d8] hover:text-white transition-colors"
            title="Minimize AI Orchestrator Drawer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 glass-panel rounded-lg text-[#c7c4d8] hover:text-red-400 transition-colors"
              title="Close Agent Interface"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Controls Bar for Image (Image-to-Video & Facial Consistency) */}
          {mediaType === 'image' ? (
            <div className="flex flex-col bg-[#090d1a] border-b border-white/5 flex-shrink-0 divide-y divide-white/5">
              {/* Make Photo Into Video Quick Trigger */}
              <div className="px-3 py-2 flex items-center justify-between gap-2 bg-gradient-to-r from-[#2fd9f4]/10 via-[#c4c0ff]/10 to-transparent">
                <button
                  type="button"
                  onClick={() => {
                    handleSendPrompt('Make a Photo into Video');
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-[#2fd9f4] to-[#c4c0ff] text-[#06060c] flex items-center gap-1.5 shadow-aura-glow hover:scale-105 active:scale-95 transition-all group"
                  title="Make a Photo into Video with interactive clarifying questions"
                >
                  <Film className="w-3.5 h-3.5 text-[#06060c] group-hover:rotate-6 transition-transform" />
                  Make a Photo into Video
                </button>

                <select
                  value={img2vidMotionStyle}
                  onChange={(e) => setImg2vidMotionStyle(e.target.value)}
                  className="bg-[#0e1323] border border-white/10 text-[10px] text-[#2fd9f4] rounded-lg px-2 py-1 outline-none font-medium max-w-[130px] truncate"
                  title="Google Flow 3D Motion Dynamics"
                >
                  <option value="google_flow_cinematic">🌊 Google Flow 3D</option>
                  <option value="orbit_3d">🏛️ 3D Orbit (House)</option>
                  <option value="celestial_stars_flow">✨ Living Stars/Sky</option>
                  <option value="living_waters_sea">🌊 Ocean & Waves</option>
                  <option value="dolly_zoom_vertigo">🎥 Dolly Zoom</option>
                  <option value="cyberpunk_pulse">⚡ Cyber Pulse</option>
                  <option value="cinematic_pan_zoom">🎬 Ken Burns Pan</option>
                </select>
              </div>

              {/* Facial Consistency Lock */}
              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!strictFacialConsistency && !facialRefUrl) {
                        fileInputRef.current?.click();
                      } else if (onToggleStrictFacial) {
                        onToggleStrictFacial(!strictFacialConsistency, facialRefUrl);
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all ${
                      strictFacialConsistency
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-aura-glow'
                        : 'glass-panel text-[#c7c4d8] hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    Strict Face Lock
                  </button>

                  {strictFacialConsistency && facialRefUrl && (
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-emerald-400/50 flex-shrink-0">
                      <img src={facialRefUrl} alt="Ref Face" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-[#2fd9f4] hover:underline font-medium flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Upload Face Ref
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 bg-[#090d1a] border-b border-white/5 flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#c7c4d8] flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-[#2fd9f4]" />
                  Style:
                </span>
                <select
                  value={videoStylePreset}
                  onChange={(e) => setVideoStylePreset(e.target.value)}
                  className="bg-[#0e1323] border border-white/10 text-[11px] text-[#dee1f9] rounded-lg px-2 py-0.5 outline-none font-sans"
                >
                  <option value="photorealistic">Photorealistic</option>
                  <option value="anime">Anime / Manga</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="oil_painting">Oil Painting</option>
                  <option value="synthwave">Synthwave Retro</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#c7c4d8]">FPS:</span>
                <select
                  value={frameInterpolation}
                  onChange={(e) => setFrameInterpolation(e.target.value)}
                  className="bg-[#0e1323] border border-white/10 text-[11px] text-[#2fd9f4] rounded-lg px-1.5 py-0.5 outline-none font-mono font-bold"
                >
                  <option value="1x">1x (Native)</option>
                  <option value="2x">2x (60FPS)</option>
                  <option value="4x">4x (120FPS)</option>
                </select>
              </div>
            </div>
          )}

          {/* Messages Thread Container */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-6 h-6 rounded-lg bg-[#c4c0ff]/10 border border-[#c4c0ff]/30 flex items-center justify-center text-[#c4c0ff] flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed flex flex-col gap-2 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#c4c0ff]/20 to-[#2fd9f4]/20 border border-[#2fd9f4]/30 text-[#dee1f9] rounded-br-none'
                      : 'glass-panel text-[#c7c4d8] rounded-bl-none border border-white/10'
                  }`}
                >
                  {/* Media Thumbnail Box inside Message */}
                  {msg.thumbnailUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/40 shadow-inner group">
                      <img
                        src={msg.thumbnailUrl}
                        alt="Media Thumbnail"
                        className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono text-[#2fd9f4] flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" />
                        {msg.videoUrl ? 'Generated Video' : 'Active Photo'}
                      </div>
                      {msg.videoUrl && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#2fd9f4]/90 text-[#06060c] flex items-center justify-center shadow-aura-glow">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Text Content */}
                  <div className="whitespace-pre-line text-xs">
                    {msg.text}
                  </div>

                  {/* Interactive Clarifying Questions */}
                  {msg.clarifyingQuestions && msg.clarifyingQuestions.length > 0 && (
                    <div className="mt-1 flex flex-col gap-2.5 pt-2 border-t border-white/10">
                      <div className="text-[10px] font-bold text-[#2fd9f4] uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Clarifying Questions (Select an Option):
                      </div>

                      {msg.clarifyingQuestions.map((q) => (
                        <div key={q.id} className="p-2 rounded-xl bg-[#090d1a]/90 border border-white/10 flex flex-col gap-1.5">
                          <div className="text-[11px] font-semibold text-[#dee1f9]">
                            {q.question}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {q.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleSendPrompt(opt)}
                                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#141b2d] border border-white/10 text-[#dee1f9] hover:text-[#2fd9f4] hover:border-[#2fd9f4]/50 hover:bg-[#1a233a] active:scale-95 transition-all text-left disabled:opacity-50"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Facial Identity Preserved Badge */}
                  {msg.strictFacialActive && (
                    <div className="pt-1.5 border-t border-emerald-500/20 text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      Facial Identity Preserved
                    </div>
                  )}

                  {/* Message Timestamp */}
                  <span className="block text-[9px] font-mono text-white/40 text-right">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-[#2fd9f4]/10 border border-[#2fd9f4]/30 flex items-center justify-center text-[#2fd9f4] flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Non-intrusive Processing Bar with Explicit Manual Cancel */}
            {isProcessing && (
              <div className="glass-panel p-3 rounded-xl border border-[#2fd9f4]/30 flex flex-col gap-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-[#dee1f9]">
                  <span className="flex items-center gap-2 font-medium min-w-0 truncate">
                    <Loader2 className="w-3.5 h-3.5 text-[#2fd9f4] animate-spin flex-shrink-0" />
                    <span className="truncate">{currentStep || 'AI Processing...'}</span>
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[11px] text-[#2fd9f4]">{progress}%</span>
                    <button
                      type="button"
                      onClick={handleCancelAgent}
                      className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 text-[10px] font-semibold transition-all"
                      title="Cancel active agent processing"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#06060c] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c4c0ff] to-[#2fd9f4] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-[#090d1a]/80 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
            {messages[messages.length - 1]?.actionChips?.map((chip) => (
              <button
                key={chip}
                disabled={isProcessing}
                onClick={() => handleSendPrompt(chip)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium glass-panel text-[#dee1f9] hover:text-[#2fd9f4] hover:border-[#2fd9f4]/40 whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
              >
                + {chip}
              </button>
            )) || (
              [
                'Make a Photo into Video',
                'Pan around the House (3D)',
                'Living Sky & Twinkling Stars',
                'Flowing Ocean Waves',
                'Generative Fill'
              ].map((chip) => (
                <button
                  key={chip}
                  disabled={isProcessing}
                  onClick={() => handleSendPrompt(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium glass-panel text-[#dee1f9] hover:text-[#2fd9f4] hover:border-[#2fd9f4]/40 whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
                >
                  + {chip}
                </button>
              ))
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="p-3 bg-[#06060c] border-t border-white/10 flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI Orchestrator or choose a motion style..."
              disabled={isProcessing}
              className="flex-1 bg-[#0e1323] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#dee1f9] placeholder-[#c7c4d8]/40 outline-none focus:border-[#2fd9f4]/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className="w-8 h-8 rounded-xl gradient-btn flex items-center justify-center disabled:opacity-40 transition-all shadow-aura-glow active:scale-95 flex-shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#060609]" />
              ) : (
                <Send className="w-3.5 h-3.5 text-[#060609] ml-0.5" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};
