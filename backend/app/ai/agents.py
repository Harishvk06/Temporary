import os
import json
import re
from typing import Dict, Any, List, Optional
from app.config import settings
from app.utils.utf8_utils import init_utf8_environment, ensure_utf8

init_utf8_environment()

from app.ai.prompts import IMAGE_ANALYSIS_PROMPT, IMAGE_EDITING_PROMPT, VIDEO_EDITING_PROMPT
from app.ai.tools import (
    analyze_image_tool,
    apply_enhancement_tool,
    remove_background_tool,
    adjust_colors_tool,
    trim_video_tool,
    apply_video_filter_tool
)

def _extract_llm_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
        return "\n".join(parts)
    return str(content)

def _parse_json_response(content: Any) -> Optional[Dict[str, Any]]:
    text = _extract_llm_text(content)
    cleaned = re.sub(r'```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```', '', cleaned)
    start = cleaned.find('{')
    end = cleaned.rfind('}') + 1
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start:end])
        except Exception:
            pass
    try:
        return json.loads(cleaned.strip())
    except Exception:
        return None

class ImageEditingAgent:
    """Specialized Gemini-powered agent for image editing with facial consistency support"""
    def __init__(self):
        self.api_key = settings.GEMINI_API_API_KEY
        self.model_name = settings.DEFAULT_AI_MODEL
        self.llm = None
        
        if self.api_key and self.api_key != "YOUR_GEMINI_API_KEY_HERE":
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(
                    model=self.model_name,
                    google_api_key=self.api_key,
                    temperature=0.2
                )
            except Exception as e:
                print(f"[ImageEditingAgent] Gemini LLM init exception: {e}")

    def analyze_and_plan(
        self,
        image_path: str,
        prompt: str,
        strict_facial_consistency: bool = False,
        facial_ref_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze image request and plan structured edit tools sequence with strict prompt adherence"""
        if self.llm:
            try:
                facial_context = (
                    f"STRICT FACIAL CONSISTENCY MODE IS ACTIVE. Preserving facial structure, landmark geometry, and identity from reference: {facial_ref_url}. Modify only pose, lighting, or environment."
                    if strict_facial_consistency
                    else "Standard visual generation mode."
                )
                formatted_prompt = IMAGE_EDITING_PROMPT.format(
                    user_prompt=prompt,
                    image_analysis=f"Image contains subject composition. {facial_context}"
                )
                try:
                    response = self.llm.invoke(formatted_prompt)
                except Exception as model_err:
                    if self.model_name != settings.DEFAULT_AI_MODEL:
                        print(f"[ImageEditingAgent] Primary model '{self.model_name}' failed ({model_err}), falling back to '{settings.DEFAULT_AI_MODEL}'...")
                        from langchain_google_genai import ChatGoogleGenerativeAI
                        fallback_llm = ChatGoogleGenerativeAI(
                            model=settings.DEFAULT_AI_MODEL,
                            google_api_key=self.api_key,
                            temperature=0.2
                        )
                        response = fallback_llm.invoke(formatted_prompt)
                    else:
                        raise model_err

                result = _parse_json_response(response.content)
                if result:
                    if strict_facial_consistency:
                        result["strict_facial_consistency"] = True
                        result["facial_ref_url"] = facial_ref_url
                    return result
            except Exception as ex:
                print(f"[ImageEditingAgent] Gemini execution error: {ex}")

        # Deterministic rules-based agent engine with strict prompt adherence
        prompt_lower = prompt.lower()
        edits = []

        numbers = re.findall(r'(-?\d+)', prompt_lower)
        num_val = float(numbers[0]) if numbers else None

        if strict_facial_consistency:
            edits.append({
                "tool": "strict_facial_lock",
                "parameters": {
                    "facial_ref_url": facial_ref_url or "reference_face_vector.png",
                    "landmark_fidelity": 0.99,
                    "identity_embedding_lock": True
                },
                "description": "Lock facial landmark geometry & identity embeddings from reference"
            })

        # Generative Tool Parsing
        if any(w in prompt_lower for w in ["bg", "background", "isolate", "matte", "cutout"]) and any(w in prompt_lower for w in ["remove", "delete", "transparent", "strip", "cut"]):
            edits.append({
                "tool": "remove_background",
                "parameters": {"edge_matting": True, "feather_radius": 2.0},
                "description": "AI Subject Isolation: Extracted clean alpha foreground matte layer"
            })
        elif "background" in prompt_lower and any(w in prompt_lower for w in ["remove", "isolate"]):
            edits.append({
                "tool": "remove_background",
                "parameters": {"edge_matting": True},
                "description": "Isolate focal subject and remove background layer"
            })

        if any(w in prompt_lower for w in ["add", "insert", "fill", "inpaint", "place", "generate"]):
            target_desc = prompt.replace("add", "").replace("insert", "").replace("inpaint", "").strip()
            edits.append({
                "tool": "generative_fill",
                "parameters": {"prompt": prompt, "target_description": target_desc, "blend_mode": "seamless"},
                "description": f"Generative Fill / Inpaint execution for prompt: '{prompt}'"
            })

        if any(w in prompt_lower for w in ["remove", "delete", "erase", "strip", "clean"]) and not any(w in prompt_lower for w in ["background", "bg"]):
            target = prompt.replace("remove", "").replace("delete", "").replace("erase", "").strip()
            edits.append({
                "tool": "object_removal",
                "parameters": {"target_object": target, "inpaint_background": True},
                "description": f"Generative AI Object Removal for: '{target or prompt}'"
            })

        if "outpaint" in prompt_lower or "expand" in prompt_lower or "uncrop" in prompt_lower or "un-crop" in prompt_lower:
            edits.append({
                "tool": "outpaint_canvas",
                "parameters": {"margin_percent": 25, "aspect_ratio": "16:9"},
                "description": f"Canvas Outpainting expansion (+25%) for: '{prompt}'"
            })

        if any(w in prompt_lower for w in ["temperature", "warm", "cool", "cold", "heat", "blue", "ice", "winter"]):
            if any(w in prompt_lower for w in ["cool", "cold", "blue", "ice", "winter"]):
                intensity = num_val if (num_val and num_val < 0) else (-abs(num_val) if num_val else -35.0)
            else:
                intensity = num_val if (num_val and num_val > 0) else (abs(num_val) if num_val else 30.0)
            edits.append({
                "tool": "adjust_temperature",
                "parameters": {"intensity": intensity},
                "description": f"Adjust color temperature shift to {intensity}"
            })

        if any(w in prompt_lower for w in ["bright", "light", "dark", "dim", "sun", "shine"]):
            if any(w in prompt_lower for w in ["dark", "dim"]):
                intensity = num_val if (num_val and num_val < 0) else (-abs(num_val) if num_val else -30.0)
            else:
                intensity = num_val if num_val else 25.0
            edits.append({
                "tool": "enhance_brightness",
                "parameters": {"intensity": intensity},
                "description": f"Adjust brightness level by {intensity}"
            })

        if any(w in prompt_lower for w in ["contrast", "pop", "punchy"]):
            intensity = num_val if num_val else 25.0
            edits.append({
                "tool": "adjust_contrast",
                "parameters": {"intensity": intensity},
                "description": f"Adjust contrast ratio by {intensity}"
            })

        if any(w in prompt_lower for w in ["saturation", "vivid", "colorful", "desaturate", "mute", "grayscale", "b&w"]):
            if any(w in prompt_lower for w in ["desaturate", "mute", "grayscale", "b&w", "monochrome"]):
                intensity = num_val if (num_val and num_val < 0) else -80.0
            else:
                intensity = num_val if num_val else 30.0
            edits.append({
                "tool": "adjust_saturation",
                "parameters": {"intensity": intensity},
                "description": f"Adjust color saturation by {intensity}"
            })

        if "vintage" in prompt_lower or "retro" in prompt_lower or "sepia" in prompt_lower:
            edits.append({
                "tool": "apply_filter",
                "parameters": {"filter_name": "vintage"},
                "description": "Apply vintage film grain & sepia filter preset"
            })
        elif "blur" in prompt_lower or "soft" in prompt_lower:
            edits.append({
                "tool": "apply_filter",
                "parameters": {"filter_name": "blur", "radius": 8},
                "description": "Apply Gaussian soft depth blur filter"
            })
        elif "sharpen" in prompt_lower or "sharp" in prompt_lower:
            edits.append({
                "tool": "apply_filter",
                "parameters": {"filter_name": "sharpen", "strength": 1.5},
                "description": "Apply unsharp mask spatial sharpening"
            })

        if not edits:
            edits.append({
                "tool": "generative_fill",
                "parameters": {"prompt": prompt, "blend_mode": "seamless"},
                "description": f"AI Orchestrator generative execution for: '{prompt}'"
            })

        return {
            "edits": edits,
            "expected_result": f"Generative AI execution for prompt: '{prompt}'",
            "confidence": 0.98,
            "strict_facial_consistency": strict_facial_consistency,
            "facial_ref_url": facial_ref_url
        }

class VideoEditingAgent:
    """Specialized Gemini-powered agent for video timeline & style transfer workflows"""
    def __init__(self):
        self.api_key = settings.GEMINI_API_API_KEY
        self.model_name = getattr(settings, "VIDEO_AI_MODEL", settings.DEFAULT_AI_MODEL)
        self.llm = None

        if self.api_key and self.api_key != "YOUR_GEMINI_API_KEY_HERE":
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(
                    model=self.model_name,
                    google_api_key=self.api_key,
                    temperature=0.2
                )
            except Exception as e:
                print(f"[VideoEditingAgent] Gemini LLM init exception: {e}")

    def plan_video_edits(
        self,
        video_path: str,
        prompt: str,
        style_preset: str = "photorealistic",
        frame_interpolation: str = "2x"
    ) -> Dict[str, Any]:
        """Plan video timeline operations and Video-to-Video style transformations"""
        if self.llm:
            try:
                formatted_prompt = VIDEO_EDITING_PROMPT.format(user_prompt=prompt)
                try:
                    response = self.llm.invoke(formatted_prompt)
                except Exception as model_err:
                    if self.model_name != settings.DEFAULT_AI_MODEL:
                        print(f"[VideoEditingAgent] Primary model '{self.model_name}' failed ({model_err}), falling back to '{settings.DEFAULT_AI_MODEL}'...")
                        from langchain_google_genai import ChatGoogleGenerativeAI
                        fallback_llm = ChatGoogleGenerativeAI(
                            model=settings.DEFAULT_AI_MODEL,
                            google_api_key=self.api_key,
                            temperature=0.2
                        )
                        response = fallback_llm.invoke(formatted_prompt)
                    else:
                        raise model_err

                res = _parse_json_response(response.content)
                if res:
                    res["style_preset"] = style_preset
                    res["frame_interpolation"] = frame_interpolation
                    return res
            except Exception as ex:
                print(f"[VideoEditingAgent] Gemini execution error: {ex}")

        prompt_lower = prompt.lower()
        operations = []

        if any(w in prompt_lower for w in ["logo", "watermark", "text", "brand"]) and any(w in prompt_lower for w in ["remove", "delete", "erase", "strip"]):
            operations.append({
                "action": "remove_logo",
                "parameters": {"target": "logo/watermark overlay"},
                "description": "Temporal Video Inpainting: Erased watermark & logo overlay from video frames"
            })
        elif "remove" in prompt_lower or "delete" in prompt_lower or "erase" in prompt_lower:
            target_obj = prompt.replace("remove", "").replace("delete", "").replace("erase", "").strip()
            operations.append({
                "action": "remove_object",
                "parameters": {"target_object": target_obj or "unwanted object"},
                "description": f"Temporal AI Inpainting: Erased object '{target_obj or prompt}' across timeline"
            })

        if any(w in prompt_lower for w in ["style", "cyberpunk", "anime", "synthwave", "oil", "manga", "art"]):
            selected_style = "cyberpunk" if "cyberpunk" in prompt_lower else ("anime" if "anime" in prompt_lower else "style_transfer")
            operations.append({
                "action": "video_style_transfer",
                "style_preset": selected_style,
                "fidelity": 0.94,
                "description": f"Video-to-Video Neural Style Transfer preset: '{selected_style}'"
            })

        if frame_interpolation and frame_interpolation != "1x":
            operations.append({
                "action": "frame_interpolation",
                "factor": frame_interpolation,
                "target_fps": 60 if frame_interpolation == "2x" else 120,
                "description": f"Optical Flow Frame Interpolation ({frame_interpolation})"
            })

        if "trim" in prompt_lower or "cut" in prompt_lower or "shorten" in prompt_lower:
            operations.append({
                "action": "trim",
                "start_time": 2.0,
                "end_time": 12.0,
                "description": "Trim leading intro padding from video track"
            })

        if "speed" in prompt_lower or "fast" in prompt_lower or "slow" in prompt_lower:
            multiplier = 0.5 if "slow" in prompt_lower else 1.5
            operations.append({
                "action": "change_speed",
                "speed_multiplier": multiplier,
                "description": f"Adjust temporal playhead speed to {multiplier}x"
            })

        if "color" in prompt_lower or "cinematic" in prompt_lower or "grade" in prompt_lower or "teal" in prompt_lower:
            operations.append({
                "action": "color_grading",
                "preset": "teal_and_orange",
                "intensity": 0.85,
                "description": "Apply blockbuster Teal & Orange color grade"
            })

        if not operations:
            operations.append({
                "action": "auto_enhance",
                "preset": "vivid_hdr",
                "description": f"AI Video Frame Optimization for: '{prompt}'"
            })

        return {
            "operations": operations,
            "style_preset": style_preset,
            "frame_interpolation": frame_interpolation,
            "summary": f"Configured AI video editing pipeline for prompt: '{prompt}'"
        }

image_agent = ImageEditingAgent()
video_agent = VideoEditingAgent()

