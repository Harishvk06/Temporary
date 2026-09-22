import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid, Check, X, Crop as CropIcon, Stamp, Pipette, Type, Layers, RefreshCw, Trash2, Square, Paintbrush, Sticker as StickerIcon, Eraser } from 'lucide-react';
import { ImageAdjustments } from '../types';
import { cropImage } from '../utils/fileHelpers';
import { Layer } from './LayerPanel';
import { aiApi } from '../api/ai';
import { API_BASE_URL } from '../utils/constants';

interface CanvasProps {
  imageSrc?: string;
  adjustments: ImageAdjustments;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  activeTool?: string;
  onApplyCrop?: (croppedDataUrl: string) => void;
  onCancelCrop?: () => void;
  layers?: Layer[];
  onColorPick?: (color: string) => void;
  onUpdateLayerText?: (id: string, text: string) => void;
  selectedTextLayerId?: string | null;
  onSelectTextLayer?: (id: string) => void;
  onMoveTextLayer?: (id: string, x: number, y: number) => void;
  onDeleteTextLayer?: (id: string) => void;
  // Shape tool
  selectedShapeLayerId?: string | null;
  onSelectShapeLayer?: (id: string) => void;
  onMoveShapeLayer?: (id: string, x: number, y: number) => void;
  onDeleteShapeLayer?: (id: string) => void;
  // Brush tool
  brushColor?: string;
  brushSize?: number;
  onAddBrushStroke?: (points: { x: number; y: number }[], color: string, size: number) => void;
  // Sticker tool
  selectedStickerLayerId?: string | null;
  onSelectStickerLayer?: (id: string) => void;
  onMoveStickerLayer?: (id: string, x: number, y: number) => void;
  onDeleteStickerLayer?: (id: string) => void;
  onApplyGeneratedImage?: (newUrl: string) => void;
  // Eraser tool (destructive — punches real transparency into the image)
  eraserSize?: number;
  onApplyErase?: (dataUrl: string) => void;
  onCancelErase?: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  imageSrc = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  adjustments,
  rotation,
  flipH,
  flipV,
  activeTool,
  onApplyCrop,
  onCancelCrop,
  layers = [],
  onColorPick,
  onUpdateLayerText,
  selectedTextLayerId,
  onSelectTextLayer,
  onMoveTextLayer,
  onDeleteTextLayer,
  selectedShapeLayerId,
  onSelectShapeLayer,
  onMoveShapeLayer,
  onDeleteShapeLayer,
  brushColor = '#2fd9f4',
  brushSize = 4,
  onAddBrushStroke,
  selectedStickerLayerId,
  onSelectStickerLayer,
  onMoveStickerLayer,
  onDeleteStickerLayer,
  onApplyGeneratedImage,
  eraserSize = 30,
  onApplyErase,
  onCancelErase,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  // Generative Fill States & Refs
  const [generativeFillRect, setGenerativeFillRect] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  const [generativeFillPrompt, setGenerativeFillPrompt] = useState<string>('');
  const [isGeneratingFill, setIsGeneratingFill] = useState<boolean>(false);
  const [generatedFillUrl, setGeneratedFillUrl] = useState<string | null>(null);
  const [generatedFillError, setGeneratedFillError] = useState<string | null>(null);
  const [fillPanelOffset, setFillPanelOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fillSelectRef = useRef<{ startX: number; startY: number } | null>(null);
  const fillDragRef = useRef<{ mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'; startX: number; startY: number; startRect: { x: number; y: number; width: number; height: number } } | null>(null);
  const fillPanelDragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  // Advanced Crop States & Refs
  type CropDragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';
  const [cropToolEnabled, setCropToolEnabled] = useState<boolean>(true);
  const [cropPanelOffset, setCropPanelOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropDragRef = useRef<{ mode: CropDragMode; startX: number; startY: number; startRect: { x: number; y: number; width: number; height: number } } | null>(null);
  const cropSelectRef = useRef<{ startX: number; startY: number } | null>(null);
  const cropPanelDragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  // Tool Specific States
  const [stampSample, setStampSample] = useState<{ x: number; y: number } | null>(null);
  const [cloneStamps, setCloneStamps] = useState<Array<{ x: number; y: number }>>([]);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const [isDrawingBrush, setIsDrawingBrush] = useState<boolean>(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Array<{ x: number; y: number }>>([]);

  // Eraser tool: a real <canvas> mirroring the image, so erasing punches
  // genuine alpha transparency into the pixels rather than a visual trick.
  const eraserCanvasRef = useRef<HTMLCanvasElement>(null);
  const eraserLoadedSrcRef = useRef<string | null>(null);
  const lastErasePointRef = useRef<{ x: number; y: number } | null>(null);
  const [isErasingNow, setIsErasingNow] = useState<boolean>(false);
  const [eraserReady, setEraserReady] = useState<boolean>(false);
  const isEraserActive = activeTool === 'eraser';

  // Normalized crop rectangle ratios (0 to 1)
  const [cropRect, setCropRect] = useState({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  const [aspectPreset, setAspectPreset] = useState<string>('free');

  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 30));
  const handleResetZoom = () => setZoom(100);

  const handlePresetChange = (preset: string, ratio?: number) => {
    setAspectPreset(preset);
    if (!ratio) {
      setCropRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
      return;
    }

    if (ratio >= 1) {
      const w = 0.8;
      const h = Math.min(0.8, 0.8 / ratio);
      setCropRect({ x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h });
    } else {
      const h = 0.8;
      const w = Math.min(0.8, 0.8 * ratio);
      setCropRect({ x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h });
    }
  };

  const handleExecuteCrop = async () => {
    if (!imageSrc) return;
    setIsCropping(true);
    try {
      const croppedUrl = await cropImage(imageSrc, cropRect);
      if (onApplyCrop) {
        onApplyCrop(croppedUrl);
      }
    } catch (e) {
      console.error('Cropping failed:', e);
    } finally {
      setIsCropping(false);
    }
  };

  const handleCanvasImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (activeTool === 'stamp') {
      if (!stampSample) {
        setStampSample({ x, y });
      } else {
        setCloneStamps((prev) => [...prev, { x, y }]);
      }
    } else if (activeTool === 'picker') {
      const palette = ['#2fd9f4', '#c4c0ff', '#38bdf8', '#f43f5e', '#a855f7', '#10b981'];
      const sampleHex = palette[Math.floor(Math.random() * palette.length)];
      setPickedColor(sampleHex);
      if (onColorPick) onColorPick(sampleHex);
    }
  };

  // Drag-to-reposition for interactive layers (text/shape/sticker): mousedown
  // on a layer starts tracking, mousemove (bound on the canvas container)
  // updates its position as a percentage of canvas size, mouseup commits.
  const handleTextLayerMouseDown = (e: React.MouseEvent, layerId: string) => {
    if (activeTool !== 'text') return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingTextId(layerId);
    if (onSelectTextLayer) onSelectTextLayer(layerId);
  };

  const handleShapeLayerMouseDown = (e: React.MouseEvent, layerId: string) => {
    if (activeTool !== 'shape') return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingShapeId(layerId);
    if (onSelectShapeLayer) onSelectShapeLayer(layerId);
  };

  const handleStickerLayerMouseDown = (e: React.MouseEvent, layerId: string) => {
    if (activeTool !== 'sticker') return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingStickerId(layerId);
    if (onSelectStickerLayer) onSelectStickerLayer(layerId);
  };

  // Brush drawing starts on mousedown over the canvas image container
  const handleImageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'brush') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setIsDrawingBrush(true);
    setCurrentStrokePoints([{ x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingTextId && !draggingShapeId && !draggingStickerId && !isDrawingBrush) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(95, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(95, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

    if (draggingTextId && onMoveTextLayer) onMoveTextLayer(draggingTextId, x, y);
    if (draggingShapeId && onMoveShapeLayer) onMoveShapeLayer(draggingShapeId, x, y);
    if (draggingStickerId && onMoveStickerLayer) onMoveStickerLayer(draggingStickerId, x, y);
    if (isDrawingBrush) {
      const rawX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const rawY = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      setCurrentStrokePoints((prev) => [...prev, { x: rawX, y: rawY }]);
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingTextId) setDraggingTextId(null);
    if (draggingShapeId) setDraggingShapeId(null);
    if (draggingStickerId) setDraggingStickerId(null);
    if (isDrawingBrush) {
      if (currentStrokePoints.length > 1 && onAddBrushStroke) {
        onAddBrushStroke(currentStrokePoints, brushColor, brushSize);
      }
      setIsDrawingBrush(false);
      setCurrentStrokePoints([]);
    }
  };

  // Load the current image onto the eraser canvas at natural resolution
  // whenever the eraser tool is (re-)activated or the source image changes.
  useEffect(() => {
    if (!isEraserActive) return;
    if (eraserLoadedSrcRef.current === imageSrc) return;

    setEraserReady(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = eraserCanvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      eraserLoadedSrcRef.current = imageSrc;
      setEraserReady(true);
    };
    img.onerror = () => {
      console.warn('Eraser: failed to load image for editing.');
    };
    img.src = imageSrc;
  }, [isEraserActive, imageSrc]);

  const eraseAtCanvasPoint = (x: number, y: number, radiusCanvasPx: number) => {
    const canvas = eraserCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radiusCanvasPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const getEraserCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = eraserCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      scale: (scaleX + scaleY) / 2,
    };
  };

  const handleEraserMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEraserActive || !eraserReady) return;
    const point = getEraserCanvasPoint(e);
    if (!point) return;
    setIsErasingNow(true);
    lastErasePointRef.current = { x: point.x, y: point.y };
    eraseAtCanvasPoint(point.x, point.y, (eraserSize / 2) * point.scale);
  };

  const handleEraserMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEraserActive || !isErasingNow) return;
    const point = getEraserCanvasPoint(e);
    if (!point) return;
    const last = lastErasePointRef.current;
    const radius = (eraserSize / 2) * point.scale;

    if (last) {
      // Interpolate between the last and current point so fast mouse
      // movement doesn't leave gaps in the erased stroke.
      const dist = Math.hypot(point.x - last.x, point.y - last.y);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.5)));
      for (let i = 1; i <= steps; i++) {
        const ix = last.x + ((point.x - last.x) * i) / steps;
        const iy = last.y + ((point.y - last.y) * i) / steps;
        eraseAtCanvasPoint(ix, iy, radius);
      }
    } else {
      eraseAtCanvasPoint(point.x, point.y, radius);
    }

    lastErasePointRef.current = { x: point.x, y: point.y };
  };

  const handleEraserMouseUp = () => {
    setIsErasingNow(false);
    lastErasePointRef.current = null;
  };

  const handleApplyErase = () => {
    const canvas = eraserCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    eraserLoadedSrcRef.current = null;
    if (onApplyErase) onApplyErase(dataUrl);
  };

  const handleCancelErase = () => {
    eraserLoadedSrcRef.current = null;
    if (onCancelErase) onCancelErase();
  };

  const computeFilterStyle = (): string => {
    const { brightness = 0, contrast = 0, saturation = 0, temperature = 0, filter = 'none' } = adjustments;
    let presetFilter = '';
    const norm = (filter || 'none').toLowerCase();

    if (norm === 'vintage' || norm === 'warm vintage') {
      presetFilter = 'sepia(45%) hue-rotate(-15deg) contrast(115%) saturate(120%)';
    } else if (norm === 'blur' || norm === 'soft blur') {
      presetFilter = 'blur(4px)';
    } else if (norm === 'sharpen' || norm === 'ultra sharpen') {
      presetFilter = 'contrast(140%) saturate(135%) brightness(105%)';
    } else {
      presetFilter = '';
    }

    let tempFilter = '';
    if (temperature > 0) {
      tempFilter = `sepia(${temperature * 0.35}%) hue-rotate(${-temperature * 0.1}deg)`;
    } else if (temperature < 0) {
      tempFilter = `hue-rotate(${temperature * 0.4}deg)`;
    }

    const baseFilter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;

    const combined = [presetFilter, tempFilter, baseFilter].filter(Boolean).join(' ');
    return combined || 'none';
  };

  const filterStyle = computeFilterStyle();

  const transformStyle = `
    scale(${zoom / 100})
    rotate(${rotation}deg)
    scaleX(${flipH ? -1 : 1})
    scaleY(${flipV ? -1 : 1})
  `;

  const isCropActive = activeTool === 'crop';
  const isStampActive = activeTool === 'stamp';
  const isPickerActive = activeTool === 'picker';
  const isTextActive = activeTool === 'text';
  const isShapeActive = activeTool === 'shape';
  const isBrushActive = activeTool === 'brush';
  const isStickerActive = activeTool === 'sticker';
  const isLayersActive = activeTool === 'layers';
  const isGenerativeFillActive = activeTool === 'generative-fill';

  const activateGenerativeFill = () => {
    setGeneratedFillError(null);
    setGeneratedFillUrl(null);
    setGenerativeFillRect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  };

  const handleFillSelectionStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGenerativeFillActive) return;
    e.preventDefault();
    e.stopPropagation();
    const container = imgRef.current?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const startY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    fillSelectRef.current = { startX, startY };

    const handleMove = (ev: MouseEvent) => {
      if (!fillSelectRef.current) return;
      const currentX = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const currentY = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
      const x = Math.min(fillSelectRef.current.startX, currentX);
      const y = Math.min(fillSelectRef.current.startY, currentY);
      const width = Math.abs(currentX - fillSelectRef.current.startX);
      const height = Math.abs(currentY - fillSelectRef.current.startY);
      if (width >= 0.02 && height >= 0.02) setGenerativeFillRect({ x, y, width, height });
    };
    const handleUp = () => {
      fillSelectRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleFillPointerDown = (e: React.MouseEvent<HTMLDivElement>, mode: typeof fillDragRef.current extends infer T ? T extends null ? never : T extends { mode: infer M } ? M : never : never) => {
    if (!isGenerativeFillActive) return;
    e.preventDefault();
    e.stopPropagation();
    const container = imgRef.current?.parentElement;
    if (!container) return;
    fillDragRef.current = { mode: mode as any, startX: e.clientX, startY: e.clientY, startRect: { ...generativeFillRect } };
    const rect = container.getBoundingClientRect();
    const handleMove = (ev: MouseEvent) => {
      if (!fillDragRef.current) return;
      const dx = (ev.clientX - fillDragRef.current.startX) / rect.width;
      const dy = (ev.clientY - fillDragRef.current.startY) / rect.height;
      const start = fillDragRef.current.startRect;
      const minSize = 0.03;
      let next = { ...start };
      if (fillDragRef.current.mode === 'move') {
        next.x = Math.max(0, Math.min(1 - start.width, start.x + dx));
        next.y = Math.max(0, Math.min(1 - start.height, start.y + dy));
      } else {
        if (fillDragRef.current.mode.includes('w')) { const right = start.x + start.width; const nx = Math.max(0, Math.min(right - minSize, start.x + dx)); next.x = nx; next.width = right - nx; }
        if (fillDragRef.current.mode.includes('e')) next.width = Math.max(minSize, Math.min(1 - start.x, start.width + dx));
        if (fillDragRef.current.mode.includes('n')) { const bottom = start.y + start.height; const ny = Math.max(0, Math.min(bottom - minSize, start.y + dy)); next.y = ny; next.height = bottom - ny; }
        if (fillDragRef.current.mode.includes('s')) next.height = Math.max(minSize, Math.min(1 - start.y, start.height + dy));
      }
      setGenerativeFillRect({ x: Math.max(0, Math.min(1 - next.width, next.x)), y: Math.max(0, Math.min(1 - next.height, next.y)), width: Math.max(minSize, Math.min(1, next.width)), height: Math.max(minSize, Math.min(1, next.height)) });
    };
    const handleUp = () => { fillDragRef.current = null; window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleFillPanelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    e.preventDefault();
    fillPanelDragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: fillPanelOffset.x, startOffsetY: fillPanelOffset.y };
    const handleMove = (ev: MouseEvent) => {
      if (!fillPanelDragRef.current) return;
      setFillPanelOffset({ x: fillPanelDragRef.current.startOffsetX + ev.clientX - fillPanelDragRef.current.startX, y: fillPanelDragRef.current.startOffsetY + ev.clientY - fillPanelDragRef.current.startY });
    };
    const handleUp = () => { fillPanelDragRef.current = null; window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleGenerateFill = async () => {
    if (!imageSrc || !generativeFillPrompt.trim() || isGeneratingFill) return;
    setIsGeneratingFill(true);
    setGeneratedFillError(null);
    try {
      const response = await fetch(imageSrc);
      if (!response.ok) throw new Error('Could not read the current canvas image.');
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('image', blob, 'auraedit-image.png');
      formData.append('prompt', generativeFillPrompt.trim());
      if (generativeFillRect) {
        formData.append('selection', JSON.stringify(generativeFillRect));
      }

      const data = await aiApi.generativeFill(formData);
      const resultUrl = data.result_url;

      if (!resultUrl) throw new Error('The AI model did not return a generated image.');
      const absoluteUrl = resultUrl.startsWith('http')
        ? resultUrl
        : `${API_BASE_URL.replace(/\/api$/, '')}${resultUrl.startsWith('/') ? '' : '/'}${resultUrl}`;

      setGeneratedFillUrl(absoluteUrl);
    } catch (error) {
      setGeneratedFillError(error instanceof Error ? error.message : 'Generative Fill failed. Please check network connection.');
    } finally {
      setIsGeneratingFill(false);
    }
  };

  const handleApplyGeneratedFill = () => {
    if (!generatedFillUrl) return;
    if (onApplyGeneratedImage) onApplyGeneratedImage(generatedFillUrl);
    else if (onApplyCrop) onApplyCrop(generatedFillUrl);
    setGeneratedFillUrl(null);
    setGenerativeFillPrompt('');
  };


  const activateCropTool = () => {
    setCropToolEnabled(true);
    setAspectPreset('free');
    setCropRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  };

  const finishCropMode = () => {
    setCropToolEnabled(false);
    if (onCancelCrop) onCancelCrop();
  };

  const handleCropPointerDown = (
    e: React.MouseEvent<HTMLDivElement>,
    mode: CropDragMode
  ) => {
    if (!isCropActive) return;
    e.preventDefault();
    e.stopPropagation();

    const container = imgRef.current?.parentElement;
    if (!container) return;

    cropDragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...cropRect },
    };

    const rect = container.getBoundingClientRect();

    const handleMove = (moveEvent: MouseEvent) => {
      if (!cropDragRef.current) return;

      const dx = (moveEvent.clientX - cropDragRef.current.startX) / rect.width;
      const dy = (moveEvent.clientY - cropDragRef.current.startY) / rect.height;
      const startRect = cropDragRef.current.startRect;
      const minSize = 0.05;
      let next = { ...startRect };

      if (cropDragRef.current.mode === 'move') {
        next.x = Math.max(0, Math.min(1 - startRect.width, startRect.x + dx));
        next.y = Math.max(0, Math.min(1 - startRect.height, startRect.y + dy));
      } else {
        if (cropDragRef.current.mode.includes('w')) {
          const right = startRect.x + startRect.width;
          const newX = Math.max(0, Math.min(right - minSize, startRect.x + dx));
          next.x = newX;
          next.width = right - newX;
        }

        if (cropDragRef.current.mode.includes('e')) {
          next.width = Math.max(
            minSize,
            Math.min(1 - startRect.x, startRect.width + dx)
          );
        }

        if (cropDragRef.current.mode.includes('n')) {
          const bottom = startRect.y + startRect.height;
          const newY = Math.max(0, Math.min(bottom - minSize, startRect.y + dy));
          next.y = newY;
          next.height = bottom - newY;
        }

        if (cropDragRef.current.mode.includes('s')) {
          next.height = Math.max(
            minSize,
            Math.min(1 - startRect.y, startRect.height + dy)
          );
        }
      }

      setCropRect({
        x: Math.max(0, Math.min(1 - next.width, next.x)),
        y: Math.max(0, Math.min(1 - next.height, next.y)),
        width: Math.max(minSize, Math.min(1, next.width)),
        height: Math.max(minSize, Math.min(1, next.height)),
      });
    };

    const handleUp = () => {
      cropDragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // Lets the user draw a brand-new crop rectangle from any point on the image.
  const handleCropSelectionStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropActive) return;
    e.preventDefault();
    e.stopPropagation();

    const container = imgRef.current?.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const startY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    cropSelectRef.current = { startX, startY };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!cropSelectRef.current) return;

      const currentX = Math.max(
        0,
        Math.min(1, (moveEvent.clientX - rect.left) / rect.width)
      );
      const currentY = Math.max(
        0,
        Math.min(1, (moveEvent.clientY - rect.top) / rect.height)
      );

      const x = Math.min(cropSelectRef.current.startX, currentX);
      const y = Math.min(cropSelectRef.current.startY, currentY);
      const width = Math.abs(currentX - cropSelectRef.current.startX);
      const height = Math.abs(currentY - cropSelectRef.current.startY);

      if (width >= 0.01 && height >= 0.01) {
        setCropRect({ x, y, width, height });
        setAspectPreset('free');
      }
    };

    const handleUp = () => {
      cropSelectRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleCropPanelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    cropPanelDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: cropPanelOffset.x,
      startOffsetY: cropPanelOffset.y,
    };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!cropPanelDragRef.current) return;

      const dx = moveEvent.clientX - cropPanelDragRef.current.startX;
      const dy = moveEvent.clientY - cropPanelDragRef.current.startY;

      setCropPanelOffset({
        x: cropPanelDragRef.current.startOffsetX + dx,
        y: cropPanelDragRef.current.startOffsetY + dy,
      });
    };

    const handleUp = () => {
      cropPanelDragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <div className="relative flex-1 bg-[#080c18] border border-[rgba(248,250,252,0.08)] rounded-2xl overflow-hidden flex items-center justify-center p-8 select-none min-h-[500px]">
      {/* Active Tool Top Banner Overlays */}
      {isCropActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in">
          <div className="flex items-center gap-1 text-xs text-[#2fd9f4] font-semibold pr-2 border-r border-white/10">
            <CropIcon className="w-4 h-4" />
            <span>Crop Mode</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'free', label: 'Freeform' },
              { id: '1:1', label: '1:1', ratio: 1 },
              { id: '16:9', label: '16:9', ratio: 16 / 9 },
              { id: '9:16', label: '9:16', ratio: 9 / 16 },
              { id: '4:3', label: '4:3', ratio: 4 / 3 },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id, p.ratio)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  aspectPreset === p.id
                    ? 'bg-[#2fd9f4] text-[#080c18] font-bold'
                    : 'text-[#c7c4d8] hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-white/10"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteCrop}
              disabled={isCropping}
              className="gradient-btn px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-aura-glow text-[#080c18]"
            >
              <Check className="w-3.5 h-3.5" />
              {isCropping ? 'Cropping...' : 'Apply'}
            </button>
            {onCancelCrop && (
              <button
                onClick={onCancelCrop}
                className="p-1 rounded-xl text-[#c7c4d8] hover:text-white hover:bg-white/10 transition-colors"
                title="Cancel Crop"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {isStampActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Stamp className="w-4 h-4 animate-bounce" />
            <span>Clone / Stamp Tool Active</span>
          </div>
          <span className="text-[#c7c4d8]">
            {stampSample
              ? `Sample at (${stampSample.x}%, ${stampSample.y}%). Click canvas to clone pixels.`
              : 'Click canvas to set clone sample point.'}
          </span>
          {stampSample && (
            <button
              onClick={() => {
                setStampSample(null);
                setCloneStamps([]);
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[#dee1f9] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Sample
            </button>
          )}
        </div>
      )}

      {isPickerActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Pipette className="w-4 h-4 animate-pulse" />
            <span>Color Picker Tool Active</span>
          </div>
          <span className="text-[#c7c4d8]">Click anywhere on canvas to sample color.</span>
          {pickedColor && (
            <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/20">
              <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: pickedColor }}></span>
              <span className="font-mono text-[#2fd9f4] font-bold">{pickedColor}</span>
            </div>
          )}
        </div>
      )}

      {isTextActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Type className="w-4 h-4" />
            <span>Add Text Layer Active</span>
          </div>
          <span className="text-[#c7c4d8]">Drag text to reposition · Double-click to edit · Hover for delete.</span>
        </div>
      )}

      {isShapeActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Square className="w-4 h-4" />
            <span>Shape Tool Active</span>
          </div>
          <span className="text-[#c7c4d8]">Pick a shape in the panel to add it · Drag on canvas to reposition.</span>
        </div>
      )}

      {isBrushActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Paintbrush className="w-4 h-4" />
            <span>Brush Tool Active</span>
          </div>
          <span className="text-[#c7c4d8]">Click and drag on canvas to draw freehand strokes.</span>
        </div>
      )}

      {isStickerActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <StickerIcon className="w-4 h-4" />
            <span>Sticker Tool Active</span>
          </div>
          <span className="text-[#c7c4d8]">Pick a sticker in the panel to place it · Drag on canvas to reposition.</span>
        </div>
      )}

      {isEraserActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Eraser className="w-4 h-4" />
            <span>Eraser Tool Active</span>
          </div>
          <span className="text-[#c7c4d8]">
            {eraserReady ? 'Click and drag to erase.' : 'Loading image…'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyErase}
              disabled={!eraserReady}
              className="gradient-btn px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-aura-glow text-[#080c18] disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
            <button
              onClick={handleCancelErase}
              className="p-1 rounded-xl text-[#c7c4d8] hover:text-white hover:bg-white/10 transition-colors"
              title="Cancel Erasing"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isLayersActive && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-4 z-40 border border-[#2fd9f4]/40 shadow-aura-glow animate-fade-in text-xs">
          <div className="flex items-center gap-2 text-[#2fd9f4] font-semibold">
            <Layers className="w-4 h-4 animate-pulse" />
            <span>Layer Inspector Mode</span>
          </div>
          <span className="text-[#c7c4d8]">Inspecting project layer stack boundaries.</span>
        </div>
      )}

      {/* Grid Overlay */}
      {showGrid && !isCropActive && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10 opacity-25 border border-[#2fd9f4]">
          <div className="border-r border-b border-[#2fd9f4]"></div>
          <div className="border-r border-b border-[#2fd9f4]"></div>
          <div className="border-b border-[#2fd9f4]"></div>
          <div className="border-r border-b border-[#2fd9f4]"></div>
          <div className="border-r border-b border-[#2fd9f4]"></div>
          <div className="border-b border-[#2fd9f4]"></div>
          <div className="border-r border-[#2fd9f4]"></div>
          <div className="border-r border-[#2fd9f4]"></div>
          <div></div>
        </div>
      )}

      {/* Canvas Media Preview Container */}
      <div
        ref={canvasRef}
        className="transition-all duration-300 ease-out flex items-center justify-center max-w-full max-h-full"
        style={{ transform: transformStyle }}
      >
        <div
          onClick={handleCanvasImageClick}
          onMouseDown={(e) => {
            handleImageMouseDown(e);
            handleCropSelectionStart(e);
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className={`relative rounded-lg overflow-hidden shadow-2xl border border-[rgba(248,250,252,0.12)] ${
            isStampActive
              ? 'cursor-crosshair'
              : isPickerActive
              ? 'cursor-cell'
              : isTextActive
              ? 'cursor-text'
              : isBrushActive
              ? 'cursor-crosshair'
              : isEraserActive
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
        >
          {isEraserActive ? (
            <canvas
              ref={eraserCanvasRef}
              onMouseDown={handleEraserMouseDown}
              onMouseMove={handleEraserMouseMove}
              onMouseUp={handleEraserMouseUp}
              onMouseLeave={handleEraserMouseUp}
              className="max-h-[600px] w-auto block"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #2a2f3d 25%, transparent 25%), linear-gradient(-45deg, #2a2f3d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2f3d 75%), linear-gradient(-45deg, transparent 75%, #2a2f3d 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#1a1e29',
              }}
            />
          ) : (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Editing Canvas"
              className="max-h-[600px] w-auto object-contain transition-all duration-200"
              style={{ filter: filterStyle }}
            />
          )}

          {/* Interactive Stamp Points Overlay */}
          {isStampActive && stampSample && (
            <div
              className="absolute w-6 h-6 rounded-full border-2 border-red-500 bg-red-500/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center shadow-lg"
              style={{ left: `${stampSample.x}%`, top: `${stampSample.y}%` }}
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            </div>
          )}
          {isStampActive &&
            cloneStamps.map((pt, i) => (
              <div
                key={i}
                className="absolute w-8 h-8 rounded-full border-2 border-[#2fd9f4] bg-[#2fd9f4]/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center shadow-aura-glow"
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
              >
                <Stamp className="w-3.5 h-3.5 text-[#2fd9f4]" />
              </div>
            ))}

          {/* Text Layer Rendering on Canvas — draggable, styled, selectable, deletable */}
          {layers
            .filter((l) => l.type === 'text' && l.visible)
            .map((layer, idx) => {
              const isSelected = isTextActive && selectedTextLayerId === layer.id;
              const isDragging = draggingTextId === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`absolute z-30 p-2 rounded-lg transition-shadow group ${
                    isTextActive ? 'border-2 border-dashed' : ''
                  } ${
                    isTextActive
                      ? isSelected
                        ? 'border-[#2fd9f4] bg-black/40 backdrop-blur-sm shadow-aura-glow'
                        : 'border-white/20 bg-black/20 backdrop-blur-sm'
                      : ''
                  } ${isDragging ? 'cursor-grabbing' : isTextActive ? 'cursor-grab' : ''}`}
                  style={{
                    top: `${layer.y ?? 20 + idx * 15}%`,
                    left: `${layer.x ?? 25}%`,
                    color: layer.color || '#2fd9f4',
                    fontSize: `${layer.fontSize || 24}px`,
                    fontFamily: layer.fontFamily || 'Inter, sans-serif',
                    fontWeight: layer.fontWeight || 'normal',
                    fontStyle: layer.fontStyle || 'normal',
                    textDecoration: layer.textDecoration || 'none',
                    textAlign: layer.textAlign || 'left',
                    userSelect: 'none',
                  }}
                  onMouseDown={(e) => handleTextLayerMouseDown(e, layer.id)}
                  onClick={(e) => {
                    if (isTextActive) {
                      e.stopPropagation();
                      if (onSelectTextLayer) onSelectTextLayer(layer.id);
                    }
                  }}
                >
                  {editingTextId === layer.id ? (
                    <input
                      type="text"
                      defaultValue={layer.text || 'Sample Text'}
                      onBlur={(e) => {
                        if (onUpdateLayerText) onUpdateLayerText(layer.id, e.target.value);
                        setEditingTextId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (onUpdateLayerText) onUpdateLayerText(layer.id, e.currentTarget.value);
                          setEditingTextId(null);
                        }
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="bg-black/80 text-[#2fd9f4] px-2 py-1 rounded border border-[#2fd9f4] outline-none font-bold text-sm"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTextId(layer.id);
                      }}
                      className="cursor-pointer hover:opacity-80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      style={{ fontWeight: layer.fontWeight || 'normal', fontStyle: layer.fontStyle || 'normal' }}
                      title="Drag to move · Double click to edit text"
                    >
                      {layer.text || 'Double-click to edit text'}
                    </span>
                  )}

                  {/* Delete button — visible on hover while Text tool is active */}
                  {isTextActive && onDeleteTextLayer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTextLayer(layer.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Delete text layer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

          {/* Brush Strokes — rendered as an SVG overlay across the whole canvas */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-25"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {layers
              .filter((l) => l.type === 'brush' && l.visible)
              .map((layer) => (
                <polyline
                  key={layer.id}
                  points={(layer.points || []).map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={layer.color || '#2fd9f4'}
                  strokeWidth={layer.strokeWidth || 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={layer.opacity ?? 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            {/* Live in-progress stroke preview while dragging */}
            {isDrawingBrush && currentStrokePoints.length > 1 && (
              <polyline
                points={currentStrokePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={brushColor}
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Shape Layer Rendering — draggable, styled, selectable, deletable */}
          {layers
            .filter((l) => l.type === 'shape' && l.visible)
            .map((layer) => {
              const isSelected = isShapeActive && selectedShapeLayerId === layer.id;
              const isDragging = draggingShapeId === layer.id;
              const isLine = layer.shapeType === 'line';
              return (
                <div
                  key={layer.id}
                  className={`absolute z-30 group ${isShapeActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                  style={{
                    top: `${layer.y ?? 30}%`,
                    left: `${layer.x ?? 30}%`,
                    width: `${layer.width || 24}%`,
                    height: isLine ? `${layer.strokeWidth || 4}px` : `${layer.height || 16}%`,
                  }}
                  onMouseDown={(e) => handleShapeLayerMouseDown(e, layer.id)}
                  onClick={(e) => {
                    if (isShapeActive) {
                      e.stopPropagation();
                      if (onSelectShapeLayer) onSelectShapeLayer(layer.id);
                    }
                  }}
                >
                  <div
                    className={`w-full h-full ${layer.shapeType === 'ellipse' ? 'rounded-full' : isLine ? 'rounded-full' : 'rounded-sm'} ${
                      isShapeActive && isSelected ? 'ring-2 ring-[#2fd9f4] ring-offset-2 ring-offset-transparent' : ''
                    }`}
                    style={{
                      backgroundColor: isLine ? (layer.strokeColor || '#2fd9f4') : (layer.fillColor || 'transparent'),
                      border: !isLine ? `${layer.strokeWidth ?? 2}px solid ${layer.strokeColor || '#2fd9f4'}` : 'none',
                      opacity: layer.opacity ?? 1,
                    }}
                  />
                  {isShapeActive && onDeleteShapeLayer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteShapeLayer(layer.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Delete shape"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

          {/* Sticker Layer Rendering — draggable, resizable, deletable */}
          {layers
            .filter((l) => l.type === 'sticker' && l.visible)
            .map((layer) => {
              const isSelected = isStickerActive && selectedStickerLayerId === layer.id;
              const isDragging = draggingStickerId === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`absolute z-30 group select-none flex items-center justify-center p-1 rounded-xl ${
                    isStickerActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
                  } ${isStickerActive && isSelected ? 'ring-2 ring-[#2fd9f4] bg-black/20 backdrop-blur-sm' : ''}`}
                  style={{
                    top: `${layer.y ?? 40}%`,
                    left: `${layer.x ?? 40}%`,
                    fontSize: `${layer.size || 48}px`,
                    lineHeight: 1,
                    opacity: layer.opacity ?? 1,
                  }}
                  onMouseDown={(e) => handleStickerLayerMouseDown(e, layer.id)}
                  onClick={(e) => {
                    if (isStickerActive) {
                      e.stopPropagation();
                      if (onSelectStickerLayer) onSelectStickerLayer(layer.id);
                    }
                  }}
                >
                  <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                    {layer.imageUrl ? (
                      <img
                        src={layer.imageUrl}
                        alt={layer.name}
                        draggable={false}
                        className="pointer-events-none select-none"
                        style={{ width: `${layer.size || 120}px`, height: 'auto', display: 'block' }}
                      />
                    ) : (
                      layer.emoji || '⭐'
                    )}
                  </span>
                  {isStickerActive && onDeleteStickerLayer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStickerLayer(layer.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Delete sticker"
                      style={{ fontSize: '12px' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

          {/* Layer Inspector Bounding Box Outlines */}
          {isLayersActive &&
            layers
              .filter((l) => l.visible)
              .map((l, i) => (
                <div
                  key={l.id}
                  className="absolute inset-x-4 border border-[#2fd9f4]/60 bg-[#2fd9f4]/5 rounded z-20 pointer-events-none flex items-start justify-end p-1 font-mono text-[9px] text-[#2fd9f4]"
                  style={{ top: `${15 + i * 25}%`, height: '22%' }}
                >
                  <span className="bg-black/80 px-1.5 py-0.5 rounded border border-[#2fd9f4]/40">
                    LAYER #{i + 1}: {l.name}
                  </span>
                </div>
              ))}

          {/* Interactive Crop Boundary Box Overlay */}
          {isCropActive && (
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleCropPointerDown(e, 'move');
              }}
              className="absolute border-2 border-[#2fd9f4] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move z-30 transition-all duration-150"
              style={{
                left: `${cropRect.x * 100}%`,
                top: `${cropRect.y * 100}%`,
                width: `${cropRect.width * 100}%`,
                height: `${cropRect.height * 100}%`,
              }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40 pointer-events-none">
                <div className="border-r border-b border-[#2fd9f4]"></div>
                <div className="border-r border-b border-[#2fd9f4]"></div>
                <div className="border-b border-[#2fd9f4]"></div>
                <div className="border-r border-b border-[#2fd9f4]"></div>
                <div className="border-r border-b border-[#2fd9f4]"></div>
                <div className="border-b border-[#2fd9f4]"></div>
                <div className="border-r border-[#2fd9f4]"></div>
                <div className="border-r border-[#2fd9f4]"></div>
                <div></div>
              </div>

              {/* Corner resize handles — enlarged hit area beyond the visible dot */}
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'nw'); }}
                className="absolute -top-2.5 -left-2.5 w-5 h-5 cursor-nwse-resize flex items-center justify-center"
              >
                <div className="w-3 h-3 bg-[#2fd9f4] border border-black rounded-sm pointer-events-none"></div>
              </div>
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'ne'); }}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 cursor-nesw-resize flex items-center justify-center"
              >
                <div className="w-3 h-3 bg-[#2fd9f4] border border-black rounded-sm pointer-events-none"></div>
              </div>
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'sw'); }}
                className="absolute -bottom-2.5 -left-2.5 w-5 h-5 cursor-nesw-resize flex items-center justify-center"
              >
                <div className="w-3 h-3 bg-[#2fd9f4] border border-black rounded-sm pointer-events-none"></div>
              </div>
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'se'); }}
                className="absolute -bottom-2.5 -right-2.5 w-5 h-5 cursor-nwse-resize flex items-center justify-center"
              >
                <div className="w-3 h-3 bg-[#2fd9f4] border border-black rounded-sm pointer-events-none"></div>
              </div>

              {/* Edge resize handles */}
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'n'); }}
                className="absolute -top-1.5 left-3 right-3 h-3 cursor-ns-resize"
              ></div>
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 's'); }}
                className="absolute -bottom-1.5 left-3 right-3 h-3 cursor-ns-resize"
              ></div>
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'w'); }}
                className="absolute -left-1.5 top-3 bottom-3 w-3 cursor-ew-resize"
              ></div>
              <div
                onMouseDown={(e) => { e.stopPropagation(); handleCropPointerDown(e, 'e'); }}
                className="absolute -right-1.5 top-3 bottom-3 w-3 cursor-ew-resize"
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 rounded-full flex items-center gap-3 z-20 shadow-aura-card">
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-medium text-[#dee1f9] w-12 text-center">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-white/10 my-auto"></div>
        <button
          onClick={handleResetZoom}
          className="p-1.5 text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5 rounded-lg transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded-lg transition-colors ${showGrid ? 'text-[#2fd9f4] bg-[#2fd9f4]/10' : 'text-[#c7c4d8] hover:text-[#2fd9f4] hover:bg-white/5'}`}
          title="Toggle Grid Overlay"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
