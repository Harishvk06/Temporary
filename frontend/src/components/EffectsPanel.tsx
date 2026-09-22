import React from 'react';
import { Sliders, Sun, Contrast, Droplet, Thermometer, UserCheck, Lock } from 'lucide-react';
import { ImageAdjustments } from '../types';

interface EffectsPanelProps {
  adjustments: ImageAdjustments;
  onChange: (key: keyof ImageAdjustments, val: number | string) => void;
  onReset: () => void;
  onPresetSelect?: (presetId: string) => void;
  strictFacialConsistency?: boolean;
  onToggleStrictFacial?: () => void;
  facialRefUrl?: string;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  adjustments,
  onChange,
  onReset,
  onPresetSelect,
  strictFacialConsistency = false,
  onToggleStrictFacial,
  facialRefUrl
}) => {
  const sliderConfig = [
    { key: 'brightness', label: 'Brightness', icon: Sun, min: -100, max: 100 },
    { key: 'contrast', label: 'Contrast', icon: Contrast, min: -100, max: 100 },
    { key: 'saturation', label: 'Saturation', icon: Droplet, min: -100, max: 100 },
    { key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100 },
  ] as const;

  const filterPresets = [
    { id: 'none', label: 'Original', testId: 'preset-original' },
    { id: 'vintage', label: 'Warm Vintage', testId: 'preset-warm-vintage' },
    { id: 'blur', label: 'Soft Blur', testId: 'preset-soft-blur' },
    { id: 'sharpen', label: 'Ultra Sharpen', testId: 'preset-ultra-sharpen' },
  ];

  return (
    <div className="w-80 glass-panel rounded-2xl p-4 flex flex-col gap-5 shadow-aura-card border border-[rgba(248,250,252,0.08)]">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#2fd9f4]" />
          <h3 className="text-sm font-bold text-[#dee1f9]">Adjustments & Effects</h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#c4c0ff] hover:text-[#2fd9f4] transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Strict Facial Consistency Mode Toggle Card */}
      <div className="p-3 rounded-xl glass-panel border border-[#c4c0ff]/20 flex flex-col gap-2 bg-[#090d1a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-[#dee1f9]">Strict Facial Consistency</span>
          </div>
          <button
            onClick={onToggleStrictFacial}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors relative ${
              strictFacialConsistency ? 'bg-emerald-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                strictFacialConsistency ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-[11px] text-[#c7c4d8]/80 leading-normal">
          {strictFacialConsistency
            ? 'Facial structure & identity locked from reference image.'
            : 'Enable to preserve subject facial features across AI generations.'}
        </p>

        {strictFacialConsistency && facialRefUrl && (
          <div className="mt-1 flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-emerald-500/30">
            <div className="w-7 h-7 rounded-md overflow-hidden border border-emerald-400 flex-shrink-0">
              <img src={facialRefUrl} alt="Facial Reference" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              Identity Reference Active
            </span>
          </div>
        )}
      </div>

      {/* Preset Filters */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-[#c7c4d8]">Style Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {filterPresets.map((preset) => {
            const currentFilter = (adjustments.filter || 'none').toLowerCase();
            const presetId = preset.id.toLowerCase();
            const presetLabel = preset.label.toLowerCase();

            const isActive =
              currentFilter === presetId ||
              currentFilter === presetLabel ||
              (presetId === 'none' && (currentFilter === '' || currentFilter === 'none' || currentFilter === 'original'));

            return (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                data-preset={preset.id}
                data-preset-label={preset.label}
                data-testid={preset.testId}
                aria-label={preset.label}
                onClick={() => {
                  onChange('filter', preset.id);
                  if (onPresetSelect) {
                    onPresetSelect(preset.id);
                  }
                }}
                className={`p-2 rounded-xl text-xs font-medium transition-all text-center border ${
                  isActive
                    ? 'bg-gradient-to-r from-[#c4c0ff]/20 to-[#2fd9f4]/20 border-[#2fd9f4] text-[#2fd9f4] shadow-aura-glow font-bold'
                    : 'bg-white/5 border-transparent text-[#c7c4d8] hover:border-white/20'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adjustment Sliders */}
      <div className="flex flex-col gap-4">
        {sliderConfig.map((item) => {
          const Icon = item.icon;
          const value = adjustments[item.key] as number;

          return (
            <div key={item.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-[#dee1f9]">
                  <Icon className="w-3.5 h-3.5 text-[#2fd9f4]" />
                  {item.label}
                </span>
                <span className="font-mono text-[#c4c0ff]">{value > 0 ? `+${value}` : value}</span>
              </div>
              <input
                type="range"
                min={item.min}
                max={item.max}
                value={value}
                onChange={(e) => onChange(item.key, Number(e.target.value))}
                className="w-full accent-[#2fd9f4] h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

