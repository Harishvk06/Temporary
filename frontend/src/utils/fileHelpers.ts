import { ImageAdjustments } from '../types';
import { Layer } from '../components/LayerPanel';

/**
 * Reads a File object into a base64 Data URL string.
 */
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Creates a browser Object URL (blob:http://...) for instant media playback.
 */
export const createMediaObjectUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Explicitly revokes a browser Object URL (blob:http://...) to free up memory immediately.
 */
export const revokeMediaObjectUrl = (url: string | null | undefined): void => {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Failed to revoke blob object URL:', err);
    }
  }
};

/**
 * Generates a thumbnail image Data URL from a video File or URL using an offscreen canvas.
 * Extracts a frame (at currentTime = 0.5s) and encodes it as a high-performance JPEG Data URL.
 */
export const generateVideoThumbnail = (fileOrUrl: File | string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const isFile = typeof fileOrUrl !== 'string';
    const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;

    let timeoutId: ReturnType<typeof setTimeout> | any = null;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (timeoutId) clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;

      try {
        video.pause();
        video.removeAttribute('src');
        video.src = '';
        video.load();
        video.remove();
      } catch (e) {
        // Cleanup error handler
      }

      if (isFile && url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Revoke error handler
        }
      }
    };

    const captureFrame = () => {
      if (isCleanedUp) return;
      try {
        const maxWidth = 480;
        const maxHeight = 270;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (ctx && width > 0 && height > 0) {
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          if (dataUrl && dataUrl.length > 100) {
            cleanup();
            resolve(dataUrl);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not extract video thumbnail frame:', e);
      }
      cleanup();
      resolve('');
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const targetTime = Math.min(1.0, video.duration > 1 ? 0.5 : 0);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
        (video as any).requestVideoFrameCallback(() => captureFrame());
      } else {
        captureFrame();
      }
    };

    video.onerror = () => {
      cleanup();
      resolve('');
    };

    timeoutId = setTimeout(() => {
      if (!isCleanedUp) {
        if (video.readyState >= 2) {
          captureFrame();
        } else {
          cleanup();
          resolve('');
        }
      }
    }, 4000);

    video.src = url;
    video.load();
  });
};

/**
 * Crops an image given bounding percentage/pixel coordinates and returns a new Data URL.
 */
export const cropImage = (
  imageSrc: string,
  cropRect: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const cropX = cropRect.x * img.naturalWidth;
        const cropY = cropRect.y * img.naturalHeight;
        const cropW = cropRect.width * img.naturalWidth;
        const cropH = cropRect.height * img.naturalHeight;

        canvas.width = Math.max(1, Math.round(cropW));
        canvas.height = Math.max(1, Math.round(cropH));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const croppedDataUrl = canvas.toDataURL('image/png');
        resolve(croppedDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

/**
 * Removes the background of an image URL using color thresholding & edge matting,
 * returning a transparent PNG Data URL with subject isolation.
 */
export const removeImageBackground = (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Sample corner pixels to calculate background color key
        const corners = [
          0,
          (canvas.width - 1) * 4,
          (canvas.height - 1) * canvas.width * 4,
          (canvas.height * canvas.width - 1) * 4
        ];

        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach((idx) => {
          bgR += data[idx] || 0;
          bgG += data[idx + 1] || 0;
          bgB += data[idx + 2] || 0;
        });
        bgR /= corners.length;
        bgG /= corners.length;
        bgB /= corners.length;

        // Subject isolation & edge matting pass
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const colorDistance = Math.sqrt(
            (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
          );

          if (colorDistance < 45) {
            data[i + 3] = 0; // Fully transparent background
          } else if (colorDistance < 70) {
            const alpha = Math.round(((colorDistance - 45) / 25) * 255);
            data[i + 3] = alpha; // Soft edge feathering
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');
        resolve(transparentDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

/**
 * AI-powered, fully client-side background removal — uses an in-browser
 * ML segmentation model (@imgly/background-removal, runs via WASM/ONNX)
 * to genuinely identify the subject vs. background, unlike naive corner
 * color-sampling. No API key, no server, no usage quota — everything
 * runs locally in the browser. The model assets are fetched once from
 * the library's CDN on first use and cached by the browser afterward.
 */
export const removeImageBackgroundAI = async (
  imageSrc: string,
  onProgress?: (key: string, current: number, total: number) => void
): Promise<string> => {
  const sourceResponse = await fetch(imageSrc);
  const sourceBlob = await sourceResponse.blob();

  onProgress?.('loading', 0, 100);

  const resultBlob = await imglyRemoveBackground(sourceBlob, {
    progress: (key: string, current: number, total: number) => {
      onProgress?.(key, current, total);
    },
  });

  onProgress?.('complete', 100, 100);

  return readFileAsDataURL(resultBlob as File);
};

/**
 * Expands the canvas by marginPercent (added evenly on all sides) and fills
 * the newly exposed border with a soft, blurred continuation of the source
 * image so the extension reads as a plausible "outpainted" background,
 * with the original sharp image composited centered on top.
 */
export const outpaintImage = (imageSrc: string, marginPercent: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const origW = img.naturalWidth || 800;
        const origH = img.naturalHeight || 600;
        const marginRatio = Math.max(0, marginPercent) / 100;
        const marginX = Math.round((origW * marginRatio) / 2);
        const marginY = Math.round((origH * marginRatio) / 2);
        const newW = origW + marginX * 2;
        const newH = origH + marginY * 2;

        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Base layer: a heavily blurred, upscaled stretch of the source
        // image filling the entire expanded canvas — this becomes the
        // generated border content once the sharp original sits on top.
        ctx.filter = 'blur(48px) saturate(112%)';
        ctx.drawImage(img, 0, 0, origW, origH, 0, 0, newW, newH);
        ctx.filter = 'none';

        // Composite the original, unmodified image centered on top
        ctx.drawImage(img, marginX, marginY, origW, origH);

        // Soften the seam between the sharp center and blurred extension
        const gradient = ctx.createRadialGradient(
          newW / 2, newH / 2, Math.min(origW, origH) * 0.42,
          newW / 2, newH / 2, Math.max(newW, newH) * 0.6
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, newW, newH);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

/**
 * Triggers a guaranteed browser download for a Blob, Data URL, or remote media URL.
 * Bypasses cross-origin navigation blocks by fetching remote URLs into local Object URLs.
 */
export const downloadBlobOrUrl = async (
  urlOrBlob: string | Blob,
  filename: string
): Promise<{ success: boolean; filename: string }> => {
  try {
    let downloadUrl: string;
    let isObjectUrl = false;

    if (urlOrBlob instanceof Blob) {
      downloadUrl = URL.createObjectURL(urlOrBlob);
      isObjectUrl = true;
    } else if (typeof urlOrBlob === 'string' && (urlOrBlob.startsWith('data:') || urlOrBlob.startsWith('blob:'))) {
      downloadUrl = urlOrBlob;
    } else if (typeof urlOrBlob === 'string') {
      try {
        const fullUrl = urlOrBlob.startsWith('http')
          ? urlOrBlob
          : `${window.location.origin}${urlOrBlob.startsWith('/') ? '' : '/'}${urlOrBlob}`;
        const response = await fetch(fullUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          downloadUrl = URL.createObjectURL(blob);
          isObjectUrl = true;
        } else {
          downloadUrl = urlOrBlob;
        }
      } catch (fetchErr) {
        console.warn('Direct blob fetch failed, falling back to direct anchor link:', fetchErr);
        downloadUrl = urlOrBlob;
      }
    } else {
      throw new Error('Invalid download target provided');
    }

    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.setAttribute('download', filename);
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      try {
        document.body.removeChild(anchor);
        if (isObjectUrl) {
          URL.revokeObjectURL(downloadUrl);
        }
      } catch (e) {
        // cleanup note
      }
    }, 2000);

    return { success: true, filename };
  } catch (err) {
    console.error('Failed to trigger download:', err);
    throw err;
  }
};

export interface CompositeExportOptions {
  imageSrc: string;
  adjustments?: ImageAdjustments;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  layers?: Layer[];
  brushStrokes?: Array<{
    id: string;
    color: string;
    size: number;
    points: Array<{ x: number; y: number }>;
  }>;
  targetWidth?: number;
  targetHeight?: number;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

export const renderCompositeImageCanvas = async (
  options: CompositeExportOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> => {
  const {
    imageSrc,
    adjustments = { brightness: 0, contrast: 0, saturation: 0, temperature: 0, filter: 'none' },
    rotation = 0,
    flipH = false,
    flipV = false,
    layers = [],
    brushStrokes = [],
    targetWidth,
    targetHeight,
    format = 'image/png',
    quality = 0.95
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const natW = img.naturalWidth || 1920;
        const natH = img.naturalHeight || 1080;

        let canvasW = targetWidth || natW;
        let canvasH = targetHeight || natH;

        if (targetWidth && !targetHeight) {
          canvasH = Math.round((natH * targetWidth) / natW);
        } else if (!targetWidth && targetHeight) {
          canvasW = Math.round((natW * targetHeight) / natH);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, canvasW);
        canvas.height = Math.max(1, canvasH);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create 2D canvas context for master export'));
          return;
        }

        // 1. Draw Base Background with CSS Filters & Transformations
        ctx.save();
        ctx.translate(canvasW / 2, canvasH / 2);

        if (rotation % 360 !== 0) {
          ctx.rotate((rotation * Math.PI) / 180);
        }
        const scaleX = flipH ? -1 : 1;
        const scaleY = flipV ? -1 : 1;
        ctx.scale(scaleX, scaleY);

        // Compute CSS-like visual filters
        const bVal = 100 + (adjustments.brightness || 0);
        const cVal = 100 + (adjustments.contrast || 0);
        const sVal = 100 + (adjustments.saturation || 0);
        let filterStr = `brightness(${Math.max(0, bVal)}%) contrast(${Math.max(0, cVal)}%) saturate(${Math.max(0, sVal)}%)`;

        if (adjustments.filter === 'vintage') {
          filterStr += ' sepia(45%) hue-rotate(-15deg)';
        } else if (adjustments.filter === 'blur') {
          filterStr += ' blur(3px)';
        }

        ctx.filter = filterStr;

        // Draw centered
        const isRotated90 = Math.abs(rotation % 180) === 90;
        const drawW = isRotated90 ? canvasH : canvasW;
        const drawH = isRotated90 ? canvasW : canvasH;

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        ctx.filter = 'none';

        // 2. Draw Vector Shape Layers
        const shapeLayers = layers.filter((l) => l.type === 'shape' && l.visible !== false);
        for (const shape of shapeLayers) {
          ctx.save();
          ctx.globalAlpha = shape.opacity !== undefined ? shape.opacity : 1.0;

          const sx = ((shape.x ?? 15) / 100) * canvasW;
          const sy = ((shape.y ?? 15) / 100) * canvasH;
          const sw = ((shape.width ?? 20) / 100) * canvasW;
          const sh = ((shape.height ?? 20) / 100) * canvasH;

          const fillCol = shape.fillColor || shape.fill || 'rgba(47, 217, 244, 0.4)';
          const strokeCol = shape.strokeColor || shape.stroke || '#2fd9f4';

          ctx.fillStyle = fillCol;
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = Math.max(1, (shape.strokeWidth || 2) * (canvasW / 1000));

          if (shape.shapeType === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(sx + sw / 2, sy + sh / 2, Math.abs(sw / 2), Math.abs(sh / 2), 0, 0, Math.PI * 2);
            if (fillCol && fillCol !== 'transparent') ctx.fill();
            if (strokeCol && strokeCol !== 'transparent') ctx.stroke();
          } else if (shape.shapeType === 'line') {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + sw, sy + sh);
            ctx.stroke();
          } else {
            // Rectangle
            if (fillCol && fillCol !== 'transparent') ctx.fillRect(sx, sy, sw, sh);
            if (strokeCol && strokeCol !== 'transparent') ctx.strokeRect(sx, sy, sw, sh);
          }
          ctx.restore();
        }

        // 3. Draw Brush Strokes (from both brushStrokes parameter and brush layers)
        const allBrushStrokes = [
          ...(brushStrokes || []),
          ...layers.filter((l) => l.type === 'brush' && l.visible !== false && l.points).map((l) => ({
            id: l.id,
            color: l.color || '#2fd9f4',
            size: l.strokeWidth || 4,
            points: l.points || []
          }))
        ];

        if (allBrushStrokes.length > 0) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (const stroke of allBrushStrokes) {
            if (!stroke.points || stroke.points.length < 2) continue;
            ctx.strokeStyle = stroke.color || '#2fd9f4';
            ctx.lineWidth = Math.max(1, (stroke.size || 4) * (canvasW / 1000));
            ctx.beginPath();
            const p0 = stroke.points[0];
            ctx.moveTo((p0.x / 100) * canvasW, (p0.y / 100) * canvasH);
            for (let i = 1; i < stroke.points.length; i++) {
              const pt = stroke.points[i];
              ctx.lineTo((pt.x / 100) * canvasW, (pt.y / 100) * canvasH);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        // 4. Draw Text Layers
        const textLayers = layers.filter((l) => l.type === 'text' && l.visible !== false);
        for (const tl of textLayers) {
          ctx.save();
          const tx = ((tl.x ?? 20) / 100) * canvasW;
          const ty = ((tl.y ?? 20) / 100) * canvasH;
          const scaledFontSize = Math.round((tl.fontSize || 24) * (canvasW / 1000) * 1.3);

          const fontStyle = tl.fontStyle || 'normal';
          const fontWeight = tl.fontWeight || 'normal';
          const fontFamily = tl.fontFamily || 'Inter, sans-serif';
          ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
          ctx.fillStyle = tl.color || '#ffffff';
          ctx.textAlign = (tl.textAlign as CanvasTextAlign) || 'left';
          ctx.textBaseline = 'top';

          // Shadow for readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          ctx.fillText(tl.text || '', tx, ty);
          ctx.restore();
        }

        // 5. Draw Sticker Layers
        const stickerLayers = layers.filter((l) => l.type === 'sticker' && l.visible !== false);
        for (const st of stickerLayers) {
          ctx.save();
          const stX = ((st.x ?? 30) / 100) * canvasW;
          const stY = ((st.y ?? 30) / 100) * canvasH;
          const stickerSize = Math.round((st.size || 48) * (canvasW / 1000) * 1.4);

          if (st.emoji) {
            ctx.font = `${stickerSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(st.emoji, stX, stY);
          }
          ctx.restore();
        }

        // 6. Output to Blob and Data URL
        const mimeType = format;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl, width: canvasW, height: canvasH });
            } else {
              reject(new Error('Failed to encode master canvas to Blob'));
            }
          },
          mimeType,
          quality
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(new Error(`Failed to load source image for export: ${e}`));
    img.src = imageSrc;
  });
};
