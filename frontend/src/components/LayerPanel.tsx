import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Layers, Trash2 } from 'lucide-react';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: string;
  text?: string;
  color?: string;
  fontSize?: number;
  opacity?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  x?: number; // position as % of canvas width
  y?: number; // position as % of canvas height
  // Shapes
  shapeType?: 'rectangle' | 'ellipse' | 'line';
  width?: number; // % of canvas width
  height?: number; // % of canvas height
  fillColor?: string;
  fill?: string;
  strokeColor?: string;
  stroke?: string;
  strokeWidth?: number;
  // Brush strokes
  points?: { x: number; y: number }[]; // % coordinates
  // Stickers
  emoji?: string;
  size?: number; // sticker font size in px, or uploaded-image display width in px
  imageUrl?: string; // set instead of emoji for an uploaded "clipart" image sticker
}

interface LayerPanelProps {
  layers: Layer[];
  onToggleVisible?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemoveLayer?: (id: string) => void;
  onDeleteLayer?: (id: string) => void;
  onAddLayer?: (type: string) => void;
  isInspectorActive?: boolean;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onToggleVisible,
  onToggleVisibility,
  onToggleLock,
  onRemoveLayer,
  onDeleteLayer,
  onAddLayer,
  isInspectorActive = false,
}) => {
  const handleVisibilityToggle = (id: string) => {
    if (onToggleVisibility) onToggleVisibility(id);
    else if (onToggleVisible) onToggleVisible(id);
  };

  const handleLayerDelete = (id: string) => {
    if (onDeleteLayer) onDeleteLayer(id);
    else if (onRemoveLayer) onRemoveLayer(id);
  };

  return (
    <div className={`flex flex-col gap-2 transition-all ${isInspectorActive ? 'p-1 rounded-xl ring-2 ring-[#2fd9f4] bg-[#2fd9f4]/5' : ''}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-[#dee1f9] uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5">
          <Layers className={`w-3.5 h-3.5 ${isInspectorActive ? 'text-[#2fd9f4] animate-pulse' : 'text-[#2fd9f4]'}`} />
          {isInspectorActive ? 'Layer Inspector (Active)' : 'Layers'}
        </span>
        <span className="text-[#c7c4d8]/60 font-mono">{layers.length} Active</span>
      </div>

      {isInspectorActive && (
        <div className="text-[11px] bg-[#2fd9f4]/10 text-[#2fd9f4] border border-[#2fd9f4]/30 px-2.5 py-1.5 rounded-lg mb-1 flex items-center justify-between font-mono">
          <span>🔍 Inspecting Layer Stack</span>
          <span className="text-[10px] text-[#c4c0ff]">Click icons to modify</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center justify-between p-2 rounded-xl glass-panel hover:border-[#2fd9f4]/30 transition-all text-xs font-medium ${
              isInspectorActive ? 'border border-[#2fd9f4]/30 bg-[#0e1323]/80' : ''
            }`}
          >
            <div className="flex items-center gap-2 max-w-[140px] truncate">
              <span className="text-[#dee1f9] truncate">{layer.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#2fd9f4] uppercase font-mono">
                {layer.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVisibilityToggle(layer.id)}
                className="text-[#c7c4d8] hover:text-[#2fd9f4] transition-colors"
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {layer.visible ? <Eye className="w-3.5 h-3.5 text-[#2fd9f4]" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
              </button>
              <button
                onClick={() => onToggleLock(layer.id)}
                className="text-[#c7c4d8] hover:text-[#2fd9f4] transition-colors"
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
              {(onDeleteLayer || onRemoveLayer) && (
                <button
                  onClick={() => handleLayerDelete(layer.id)}
                  className="text-[#c7c4d8] hover:text-red-400 transition-colors"
                  title="Remove Layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
