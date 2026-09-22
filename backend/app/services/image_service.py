import os
from PIL import Image as PILImage, ImageEnhance, ImageFilter
from typing import Dict, Any

class ImageProcessingService:
    @staticmethod
    def process_image_adjustment(input_path: str, output_path: str, adjustments: Dict[str, Any]) -> str:
        """Applies basic image adjustments using PIL"""
        if not os.path.exists(input_path):
            # Create a placeholder image if file doesn't exist
            img = PILImage.new('RGB', (800, 600), color=(30, 41, 59))
        else:
            img = PILImage.open(input_path)

        # Brightness
        if 'brightness' in adjustments:
            factor = 1.0 + (float(adjustments['brightness']) / 100.0)
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(max(0.1, factor))

        # Contrast
        if 'contrast' in adjustments:
            factor = 1.0 + (float(adjustments['contrast']) / 100.0)
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(max(0.1, factor))

        # Saturation
        if 'saturation' in adjustments:
            factor = 1.0 + (float(adjustments['saturation']) / 100.0)
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(max(0.0, factor))

        # Apply specific filter effect if requested
        filter_type = adjustments.get('filter')
        if filter_type == 'vintage':
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(0.7)
        elif filter_type == 'blur':
            img = img.filter(ImageFilter.BLUR)
        elif filter_type == 'sharpen':
            img = img.filter(ImageFilter.SHARPEN)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img.save(output_path)
        return output_path

image_processor = ImageProcessingService()
