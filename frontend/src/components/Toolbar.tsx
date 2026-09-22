import React, { useState, useRef } from 'react';
import {
  Crop,
  RotateCw,
  FlipHorizontal,
  Stamp,
  Pipette,
  Type,
  Layers,
  Wand2,
  Sparkles,
  Maximize,
  Scissors,
  UserCheck,
  X,
  Check,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Square,
  Circle,
  Minus,
  Paintbrush,
  Sticker as StickerIcon,
  Eraser,
  ImagePlus
} from 'lucide-react';
import { Layer } from './LayerPanel';

interface ToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  onRotate: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onStamp?: () => void;
  onPicker?: () => void;
  onText?: () => void;
  onLayers?: () => void;
  onGenerativeFill?: (prompt: string) => void;
  onOutpaint?: (margin: number) => void;
  onRemoveBackground?: () => void;
  strictFacialConsistency?: boolean;
  onToggleStrictFacial?: () => void;
  // Text tool: full layer list, which text layer is selected, and mutators
  textLayers?: Layer[];
  selectedTextLayerId?: string | null;
  onSelectTextLayer?: (id: string) => void;
  onAddTextLayer?: () => void;
  onUpdateTextLayerStyle?: (id: string, updates: Partial<Layer>) => void;
  onDeleteTextLayer?: (id: string) => void;
  // Shape tool
  shapeLayers?: Layer[];
  selectedShapeLayerId?: string | null;
  onSelectShapeLayer?: (id: string) => void;
  onAddShape?: (shapeType: 'rectangle' | 'ellipse' | 'line') => void;
  onUpdateShapeStyle?: (id: string, updates: Partial<Layer>) => void;
  onDeleteShapeLayer?: (id: string) => void;
  // Brush tool
  brushColor?: string;
  brushSize?: number;
  onBrushColorChange?: (color: string) => void;
  onBrushSizeChange?: (size: number) => void;
  brushStrokeCount?: number;
  onClearAllBrushStrokes?: () => void;
  onDeleteLastBrushStroke?: () => void;
  // Eraser tool (destructive, punches real transparency into the image)
  eraserSize?: number;
  onEraserSizeChange?: (size: number) => void;
  // Sticker tool
  stickerLayers?: Layer[];
  selectedStickerLayerId?: string | null;
  onSelectStickerLayer?: (id: string) => void;
  onAddSticker?: (emoji: string) => void;
  onAddImageSticker?: (file: File) => void;
  onUpdateStickerStyle?: (id: string, updates: Partial<Layer>) => void;
  onDeleteStickerLayer?: (id: string) => void;
}

const FONT_FAMILIES = [
  { id: 'Inter, sans-serif', label: 'Inter' },
  { id: "'Geist Mono', monospace", label: 'Geist Mono' },
  { id: 'Georgia, serif', label: 'Georgia' },
  { id: "'Courier New', monospace", label: 'Courier' },
  { id: 'Impact, sans-serif', label: 'Impact' },
];

const COLOR_SWATCHES = ['#2fd9f4', '#c4c0ff', '#ffffff', '#f43f5e', '#facc15', '#10b981'];

const STICKER_EMOJIS = ['⭐', '🔥', '❤️', '✨', '👍', '🎉', '😂', '😎', '🚀', '🌈', '💯', '⚡', '🌟', '💥', '🎯', '🏆'];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onRotate,
  onFlipH,
  onFlipV,
  onStamp,
  onPicker,
  onText,
  onLayers,
  onGenerativeFill,
  onOutpaint,
  onRemoveBackground,
  strictFacialConsistency = false,
  onToggleStrictFacial,
  textLayers = [],
  selectedTextLayerId,
  onSelectTextLayer,
  onAddTextLayer,
  onUpdateTextLayerStyle,
  onDeleteTextLayer,
  shapeLayers = [],
  selectedShapeLayerId,
  onSelectShapeLayer,
  onAddShape,
  onUpdateShapeStyle,
  onDeleteShapeLayer,
  brushColor = '#2fd9f4',
  brushSize = 4,
  onBrushColorChange,
  onBrushSizeChange,
  brushStrokeCount = 0,
  onClearAllBrushStrokes,
  onDeleteLastBrushStroke,
  eraserSize = 30,
  onEraserSizeChange,
  stickerLayers = [],
  selectedStickerLayerId,
  onSelectStickerLayer,
  onAddSticker,
  onAddImageSticker,
  onUpdateStickerStyle,
  onDeleteStickerLayer,
}) => {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const imageStickerInputRef = useRef<HTMLInputElement>(null);

  // Reveal-on-demand local parameters state
  const [stampRadius, setStampRadius] = useState<number>(25);
  const [fillPrompt, setFillPrompt] = useState<string>('');
  const [outpaintMargin, setOutpaintMargin] = useState<number>(20);

  const tools = [
    { id: 'select', name: 'Select / Pointer', icon: Wand2 },
    { id: 'fill', name: 'Generative Fill', icon: Sparkles },
    { id: 'outpaint', name: 'Outpaint Canvas', icon: Maximize },
    { id: 'bgremove', name: 'Remove Background', icon: Scissors, onClick: onRemoveBackground },
    { id: 'facial', name: 'Strict Facial Lock Mode', icon: UserCheck, onClick: onToggleStrictFacial },
    { id: 'crop', name: 'Crop Canvas', icon: Crop },
    { id: 'rotate', name: 'Rotate 90°', icon: RotateCw, onClick: onRotate },
    { id: 'fliph', name: 'Flip Horizontal', icon: FlipHorizontal, onClick: onFlipH },
    { id: 'stamp', name: 'Clone / Stamp Tool', icon: Stamp, onClick: onStamp },
    { id: 'picker', name: 'Color Picker', icon: Pipette, onClick: onPicker },
    { id: 'text', name: 'Add Text Layer', icon: Type, onClick: onText },
    { id: 'shape', name: 'Shapes Tool', icon: Square },
    { id: 'brush', name: 'Brush / Draw', icon: Paintbrush },
    { id: 'eraser', name: 'Eraser (Remove Any Part of Image)', icon: Eraser },
    { id: 'sticker', name: 'Stickers', icon: StickerIcon },
    { id: 'layers', name: 'Layer Inspector', icon: Layers, onClick: onLayers },
  ];

  const selectedTextLayer = textLayers.find((l) => l.id === selectedTextLayerId) || textLayers[textLayers.length - 1];
  const selectedShapeLayer = shapeLayers.find((l) => l.id === selectedShapeLayerId) || shapeLayers[shapeLayers.length - 1];
  const selectedStickerLayer = stickerLayers.find((l) => l.id === selectedStickerLayerId) || stickerLayers[stickerLayers.length - 1];

  const patchSelectedText = (updates: Partial<Layer>) => {
    if (selectedTextLayer && onUpdateTextLayerStyle) {
      onUpdateTextLayerStyle(selectedTextLayer.id, updates);
    }
  };

  const patchSelectedShape = (updates: Partial<Layer>) => {
    if (selectedShapeLayer && onUpdateShapeStyle) {
      onUpdateShapeStyle(selectedShapeLayer.id, updates);
    }
  };

  const patchSelectedSticker = (updates: Partial<Layer>) => {
    if (selectedStickerLayer && onUpdateStickerStyle) {
      onUpdateStickerStyle(selectedStickerLayer.id, updates);
    }
  };

  return (
    <aside className="relative flex items-start gap-3 z-40">
      {/* Primary Toolbar Icons Column */}
      <div className="w-16 glass-panel rounded-2xl p-2 flex flex-col items-center gap-2.5 shadow-aura-card transform-gpu-3d max-h-[85vh] overflow-y-auto">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id || (tool.id === 'facial' && strictFacialConsistency);
          const isHovered = hoveredTool === tool.id;

          return (
            <div key={tool.id} className="relative flex items-center">
              <button
                id={`tool-${tool.id}`}
                data-testid={`tool-${tool.id}`}
                aria-label={tool.name}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                onClick={(e) => {
                  setHoveredTool(null);
                  (e.currentTarget as HTMLButtonElement).blur();
                  setActiveTool(tool.id);
                  if (tool.onClick) tool.onClick();
                }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 transform-gpu-3d flex-shrink-0 ${isActive
                    ? 'bg-gradient-to-tr from-[#c4c0ff]/30 to-[#2fd9f4]/30 text-[#2fd9f4] border border-[#2fd9f4]/50 shadow-aura-glow'
                    : 'text-[#c7c4d8] hover:text-[#dee1f9] hover:bg-white/5'
                  }`}
              >
                <Icon className="w-5 h-5" />
              </button>

              {/* Hover Tooltip */}
              {isHovered && (
                <div
                  role="tooltip"
                  data-testid={`tooltip-${tool.id}`}
                  className="absolute left-16 px-3 py-1.5 glass-panel text-xs font-semibold text-[#dee1f9] rounded-xl whitespace-nowrap pointer-events-none z-[100] shadow-2xl border border-white/20 bg-[#06060c]/95 backdrop-blur-md animate-fadeIn"
                >
                  {tool.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reveal-on-Demand Parameter Drawer (Revealed ONLY for Active Tool) */}
      {['stamp', 'fill', 'outpaint', 'bgremove', 'picker', 'facial', 'text', 'shape', 'brush', 'eraser', 'sticker'].includes(activeTool) && (
        <div className="w-64 glass-panel rounded-2xl p-4 border border-[#2fd9f4]/30 shadow-aura-3d animate-fadeIn flex flex-col gap-3 text-xs max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-[#dee1f9] capitalize flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2fd9f4]" />
              {activeTool === 'stamp' && 'Clone Stamp Options'}
              {activeTool === 'fill' && 'Generative Fill'}
              {activeTool === 'outpaint' && 'Outpaint Canvas'}
              {activeTool === 'bgremove' && 'Background Removal & Masking'}
              {activeTool === 'picker' && 'Color Eyedropper'}
              {activeTool === 'facial' && 'Facial Lock Controls'}
              {activeTool === 'text' && 'Text Layer Properties'}
              {activeTool === 'shape' && 'Shape Properties'}
              {activeTool === 'brush' && 'Brush / Draw'}
              {activeTool === 'eraser' && 'Eraser Tool'}
              {activeTool === 'sticker' && 'Sticker Properties'}
            </span>
            <button
              onClick={() => setActiveTool('select')}
              className="text-[#c7c4d8] hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tool-specific Parameters */}
          {activeTool === 'stamp' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[#c7c4d8]">Stamp Radius</span>
                <span className="text-[#2fd9f4] font-bold">{stampRadius}px</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={stampRadius}
                onChange={(e) => setStampRadius(Number(e.target.value))}
                className="w-full accent-[#2fd9f4] cursor-pointer"
              />
              <p className="text-[10px] text-[#c7c4d8]/70 mt-1">
                Click on source canvas region, then drag to clone pixels onto target area.
              </p>
            </div>
          )}

          {activeTool === 'fill' && (
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-medium text-[#c7c4d8]">Inpaint Mask Prompt</label>
              <input
                type="text"
                value={fillPrompt}
                onChange={(e) => setFillPrompt(e.target.value)}
                placeholder="e.g. Add neon glowing sunglasses..."
                className="w-full bg-[#06060c] border border-white/10 rounded-xl p-2 text-xs text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
              />
              <button
                onClick={() => {
                  if (onGenerativeFill && fillPrompt.trim()) {
                    onGenerativeFill(fillPrompt);
                    setFillPrompt('');
                  }
                }}
                disabled={!fillPrompt.trim()}
                className="gradient-btn py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-aura-glow disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-[#060609]" />
                Execute Generative Fill
              </button>
            </div>
          )}

          {activeTool === 'outpaint' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[#c7c4d8]">Outpaint Expansion</span>
                <span className="text-[#2fd9f4] font-bold">+{outpaintMargin}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                value={outpaintMargin}
                onChange={(e) => setOutpaintMargin(Number(e.target.value))}
                className="w-full accent-[#2fd9f4] cursor-pointer"
              />
              <button
                onClick={() => onOutpaint && onOutpaint(outpaintMargin)}
                className="gradient-btn py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-aura-glow mt-1"
              >
                <Maximize className="w-3.5 h-3.5 text-[#060609]" />
                Expand Canvas Outpaint
              </button>
            </div>
          )}

          {activeTool === 'bgremove' && (
            <div className="flex flex-col gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-medium flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-400" />
                <span>AI Subject Matting & Background Stripper</span>
              </div>
              <p className="text-[10px] text-[#c7c4d8]/80">
                Isolates foreground focal elements and extracts clean alpha matte layer.
              </p>
              <button
                onClick={() => onRemoveBackground && onRemoveBackground()}
                className="gradient-btn py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-aura-glow mt-1"
              >
                <Scissors className="w-3.5 h-3.5 text-[#060609]" />
                Strip Background Layer
              </button>
            </div>
          )}

          {activeTool === 'picker' && (
            <p className="text-[11px] text-[#c7c4d8]">
              Eyedropper sampler active. Click any pixel on the central canvas to extract precise RGB/Hex color tokens.
            </p>
          )}

          {activeTool === 'facial' && (
            <div className="flex flex-col gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2 font-medium">
                <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Strict Facial Consistency Mode {strictFacialConsistency ? 'ACTIVE' : 'READY'}</span>
              </div>
              <p className="text-[10px] text-[#c7c4d8]/80">
                Locks subject identity & facial features across AI edits while modifying pose, background, or style.
              </p>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="flex flex-col gap-3">
              {/* Layer picker (only shown when multiple text layers exist) */}
              {textLayers.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#c7c4d8]">Editing Layer</label>
                  <select
                    value={selectedTextLayer?.id || ''}
                    onChange={(e) => onSelectTextLayer && onSelectTextLayer(e.target.value)}
                    className="w-full bg-[#06060c] border border-white/10 rounded-xl p-2 text-xs text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
                  >
                    {textLayers.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTextLayer ? (
                <>
                  {/* Live text content editor */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-[#c7c4d8]">Text Content</label>
                    <input
                      type="text"
                      value={selectedTextLayer.text || ''}
                      onChange={(e) => patchSelectedText({ text: e.target.value })}
                      className="w-full bg-[#06060c] border border-white/10 rounded-xl p-2 text-xs text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
                    />
                  </div>

                  {/* Font family */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-[#c7c4d8]">Font Family</label>
                    <select
                      value={selectedTextLayer.fontFamily || FONT_FAMILIES[0].id}
                      onChange={(e) => patchSelectedText({ fontFamily: e.target.value })}
                      className="w-full bg-[#06060c] border border-white/10 rounded-xl p-2 text-xs text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Font size */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#c7c4d8]">Font Size</span>
                      <span className="text-[#2fd9f4] font-bold">{selectedTextLayer.fontSize || 24}px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={96}
                      value={selectedTextLayer.fontSize || 24}
                      onChange={(e) => patchSelectedText({ fontSize: Number(e.target.value) })}
                      className="w-full accent-[#2fd9f4] cursor-pointer"
                    />
                  </div>

                  {/* Style toggles: bold / italic / underline + alignment */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => patchSelectedText({ fontWeight: selectedTextLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                        selectedTextLayer.fontWeight === 'bold'
                          ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/50'
                          : 'text-[#c7c4d8] border border-white/10 hover:bg-white/5'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => patchSelectedText({ fontStyle: selectedTextLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                        selectedTextLayer.fontStyle === 'italic'
                          ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/50'
                          : 'text-[#c7c4d8] border border-white/10 hover:bg-white/5'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => patchSelectedText({ textDecoration: selectedTextLayer.textDecoration === 'underline' ? 'none' : 'underline' })}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                        selectedTextLayer.textDecoration === 'underline'
                          ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/50'
                          : 'text-[#c7c4d8] border border-white/10 hover:bg-white/5'
                      }`}
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {([
                      { id: 'left', icon: AlignLeft },
                      { id: 'center', icon: AlignCenter },
                      { id: 'right', icon: AlignRight },
                    ] as const).map(({ id, icon: AlignIcon }) => (
                      <button
                        key={id}
                        onClick={() => patchSelectedText({ textAlign: id })}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                          (selectedTextLayer.textAlign || 'left') === id
                            ? 'bg-[#2fd9f4]/20 text-[#2fd9f4] border border-[#2fd9f4]/50'
                            : 'text-[#c7c4d8] border border-white/10 hover:bg-white/5'
                        }`}
                        title={`Align ${id}`}
                      >
                        <AlignIcon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>

                  {/* Color swatches */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-[#c7c4d8]">Text Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_SWATCHES.map((c) => (
                        <button
                          key={c}
                          onClick={() => patchSelectedText({ color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            selectedTextLayer.color === c ? 'border-[#2fd9f4] scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedTextLayer.color || '#2fd9f4'}
                        onChange={(e) => patchSelectedText({ color: e.target.value })}
                        className="w-6 h-6 rounded-full border-2 border-white/20 bg-transparent cursor-pointer p-0"
                        title="Custom color"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-[#c7c4d8]/70">
                    Drag the text directly on the canvas to reposition it. Double-click to edit inline.
                  </p>

                  {/* Delete this layer */}
                  {onDeleteTextLayer && (
                    <button
                      onClick={() => onDeleteTextLayer(selectedTextLayer.id)}
                      className="py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete This Text Layer
                    </button>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#c7c4d8]/70">No text layers yet. Add one to get started.</p>
              )}

              {/* Add another text layer */}
              {onAddTextLayer && (
                <button
                  onClick={onAddTextLayer}
                  className="gradient-btn py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-aura-glow"
                >
                  <Plus className="w-3.5 h-3.5 text-[#060609]" />
                  Add New Text Layer
                </button>
              )}
            </div>
          )}

          {activeTool === 'shape' && (
            <div className="flex flex-col gap-3">
              {/* Shape type picker — always adds a new shape */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#c7c4d8]">Add Shape</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAddShape && onAddShape('rectangle')}
                    className="flex-1 py-2 rounded-lg flex items-center justify-center text-[#c7c4d8] border border-white/10 hover:bg-white/5 hover:text-[#2fd9f4] transition-all"
                    title="Add Rectangle"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onAddShape && onAddShape('ellipse')}
                    className="flex-1 py-2 rounded-lg flex items-center justify-center text-[#c7c4d8] border border-white/10 hover:bg-white/5 hover:text-[#2fd9f4] transition-all"
                    title="Add Ellipse"
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onAddShape && onAddShape('line')}
                    className="flex-1 py-2 rounded-lg flex items-center justify-center text-[#c7c4d8] border border-white/10 hover:bg-white/5 hover:text-[#2fd9f4] transition-all"
                    title="Add Line"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Layer picker (only shown when multiple shape layers exist) */}
              {shapeLayers.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#c7c4d8]">Editing Shape</label>
                  <select
                    value={selectedShapeLayer?.id || ''}
                    onChange={(e) => onSelectShapeLayer && onSelectShapeLayer(e.target.value)}
                    className="w-full bg-[#06060c] border border-white/10 rounded-xl p-2 text-xs text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
                  >
                    {shapeLayers.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedShapeLayer ? (
                <>
                  {/* Size sliders */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#c7c4d8]">Width</span>
                      <span className="text-[#2fd9f4] font-bold">{selectedShapeLayer.width || 24}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      value={selectedShapeLayer.width || 24}
                      onChange={(e) => patchSelectedShape({ width: Number(e.target.value) })}
                      className="w-full accent-[#2fd9f4] cursor-pointer"
                    />
                  </div>

                  {selectedShapeLayer.shapeType !== 'line' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-[#c7c4d8]">Height</span>
                        <span className="text-[#2fd9f4] font-bold">{selectedShapeLayer.height || 16}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={90}
                        value={selectedShapeLayer.height || 16}
                        onChange={(e) => patchSelectedShape({ height: Number(e.target.value) })}
                        className="w-full accent-[#2fd9f4] cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Stroke width */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#c7c4d8]">{selectedShapeLayer.shapeType === 'line' ? 'Line Thickness' : 'Stroke Width'}</span>
                      <span className="text-[#2fd9f4] font-bold">{selectedShapeLayer.strokeWidth ?? 2}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={selectedShapeLayer.strokeWidth ?? 2}
                      onChange={(e) => patchSelectedShape({ strokeWidth: Number(e.target.value) })}
                      className="w-full accent-[#2fd9f4] cursor-pointer"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#c7c4d8]">Opacity</span>
                      <span className="text-[#2fd9f4] font-bold">{Math.round((selectedShapeLayer.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round((selectedShapeLayer.opacity ?? 1) * 100)}
                      onChange={(e) => patchSelectedShape({ opacity: Number(e.target.value) / 100 })}
                      className="w-full accent-[#2fd9f4] cursor-pointer"
                    />
                  </div>

                  {/* Fill color (not for lines) */}
                  {selectedShapeLayer.shapeType !== 'line' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#c7c4d8]">Fill Color</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {COLOR_SWATCHES.map((c) => (
                          <button
                            key={c}
                            onClick={() => patchSelectedShape({ fillColor: `${c}40` })}
                            className="w-6 h-6 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                            style={{ backgroundColor: `${c}40` }}
                            title={c}
                          />
                        ))}
                        <button
                          onClick={() => patchSelectedShape({ fillColor: 'transparent' })}
                          className="w-6 h-6 rounded-full border-2 border-dashed border-white/30 hover:scale-110 transition-transform bg-[repeating-conic-gradient(#333_0%_25%,transparent_0%_50%)] bg-[length:6px_6px]"
                          title="No fill"
                        />
                      </div>
                    </div>
                  )}

                  {/* Stroke color */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-[#c7c4d8]">
                      {selectedShapeLayer.shapeType === 'line' ? 'Line Color' : 'Stroke Color'}
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_SWATCHES.map((c) => (
                        <button
                          key={c}
                          onClick={() => patchSelectedShape({ strokeColor: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            selectedShapeLayer.strokeColor === c ? 'border-[#2fd9f4] scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedShapeLayer.strokeColor || '#2fd9f4'}
                        onChange={(e) => patchSelectedShape({ strokeColor: e.target.value })}
                        className="w-6 h-6 rounded-full border-2 border-white/20 bg-transparent cursor-pointer p-0"
                        title="Custom color"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-[#c7c4d8]/70">
                    Drag the shape directly on the canvas to reposition it.
                  </p>

                  {onDeleteShapeLayer && (
                    <button
                      onClick={() => onDeleteShapeLayer(selectedShapeLayer.id)}
                      className="py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete This Shape
                    </button>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#c7c4d8]/70">No shapes yet. Pick a shape above to add one.</p>
              )}
            </div>
          )}

          {activeTool === 'brush' && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#c7c4d8]">
                Click and drag directly on the canvas to draw freehand strokes.
              </p>

              {/* Brush color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#c7c4d8]">Brush Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => onBrushColorChange && onBrushColorChange(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        brushColor === c ? 'border-[#2fd9f4] scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => onBrushColorChange && onBrushColorChange(e.target.value)}
                    className="w-6 h-6 rounded-full border-2 border-white/20 bg-transparent cursor-pointer p-0"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Brush size */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-[#c7c4d8]">Brush Size</span>
                  <span className="text-[#2fd9f4] font-bold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange && onBrushSizeChange(Number(e.target.value))}
                  className="w-full accent-[#2fd9f4] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#c7c4d8]/80 bg-white/5 px-2.5 py-1.5 rounded-lg">
                <span>Strokes drawn</span>
                <span className="font-mono text-[#2fd9f4] font-bold">{brushStrokeCount}</span>
              </div>

              {onDeleteLastBrushStroke && (
                <button
                  onClick={onDeleteLastBrushStroke}
                  disabled={brushStrokeCount === 0}
                  className="py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-[#c7c4d8] border border-white/10 hover:bg-white/5 transition-all disabled:opacity-40"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Undo Last Stroke
                </button>
              )}

              {onClearAllBrushStrokes && (
                <button
                  onClick={onClearAllBrushStrokes}
                  disabled={brushStrokeCount === 0}
                  className="py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All Strokes
                </button>
              )}
            </div>
          )}

          {activeTool === 'eraser' && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#c7c4d8]">
                Click and drag directly on the canvas to erase — this removes real pixels from the image (true transparency), not a color trick.
              </p>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-[#c7c4d8]">Eraser Size</span>
                  <span className="text-[#2fd9f4] font-bold">{eraserSize}px</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={150}
                  value={eraserSize}
                  onChange={(e) => onEraserSizeChange && onEraserSizeChange(Number(e.target.value))}
                  className="w-full accent-[#2fd9f4] cursor-pointer"
                />
              </div>

              <p className="text-[10px] text-[#c7c4d8]/70">
                Use the Apply / Cancel buttons above the canvas to save or discard your erasing.
              </p>
            </div>
          )}

          {activeTool === 'sticker' && (
            <div className="flex flex-col gap-3">
              {/* Upload your own image as a clipart-style sticker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#c7c4d8]">Upload Your Own Image</label>
                <input
                  ref={imageStickerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onAddImageSticker) onAddImageSticker(file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => imageStickerInputRef.current?.click()}
                  className="w-full py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2fd9f4] border border-dashed border-[#2fd9f4]/40 hover:bg-[#2fd9f4]/10 hover:border-[#2fd9f4]/70 transition-all"
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload Image (Clipart)
                </button>
              </div>

              {/* Emoji picker grid */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#c7c4d8]">Or Pick a Sticker</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {STICKER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onAddSticker && onAddSticker(emoji)}
                      className="aspect-square rounded-lg flex items-center justify-center text-xl border border-white/10 hover:bg-white/5 hover:border-[#2fd9f4]/40 transition-all"
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layer picker (only shown when multiple stickers exist) */}
              {stickerLayers.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-[#c7c4d8]">Editing Sticker</label>
                  <select
                    value={selectedStickerLayer?.id || ''}
                    onChange={(e) => onSelectStickerLayer && onSelectStickerLayer(e.target.value)}
                    className="w-full bg-[#06060c] border border-white/10 rounded-xl p-2 text-xs text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
                  >
                    {stickerLayers.map((l) => (
                      <option key={l.id} value={l.id}>{l.imageUrl ? '🖼️' : l.emoji} {l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedStickerLayer ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#c7c4d8]">Size</span>
                      <span className="text-[#2fd9f4] font-bold">{selectedStickerLayer.size || 48}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={selectedStickerLayer.imageUrl ? 500 : 160}
                      value={selectedStickerLayer.size || 48}
                      onChange={(e) => patchSelectedSticker({ size: Number(e.target.value) })}
                      className="w-full accent-[#2fd9f4] cursor-pointer"
                    />
                  </div>

                  <p className="text-[10px] text-[#c7c4d8]/70">
                    Drag the sticker directly on the canvas to reposition it.
                  </p>

                  {onDeleteStickerLayer && (
                    <button
                      onClick={() => onDeleteStickerLayer(selectedStickerLayer.id)}
                      className="py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete This Sticker
                    </button>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#c7c4d8]/70">No stickers yet. Upload an image or pick one above.</p>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

