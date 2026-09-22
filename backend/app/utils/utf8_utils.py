import sys
import os
import re
import unicodedata
from typing import Dict, Any, List, Optional

def init_utf8_environment():
    """
    Reconfigures sys.stdout and sys.stderr with UTF-8 encoding and 'replace' error handler.
    Sets PYTHONIOENCODING in the process environment to prevent Windows 'charmap' / cp1252 codec errors.
    """
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    if hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# Initialize UTF-8 environment immediately upon module import
init_utf8_environment()


def ensure_utf8(text: Any) -> str:
    """
    Ensures input is converted to a valid, normalized UTF-8 string.
    Safely decodes bytes and normalizes Unicode characters (NFC).
    """
    if text is None:
        return ""
    if isinstance(text, bytes):
        try:
            text = text.decode("utf-8", errors="replace")
        except Exception:
            text = text.decode("latin1", errors="replace")
    elif not isinstance(text, str):
        text = str(text)

    # Normalize Unicode characters (e.g. composed forms)
    return unicodedata.normalize("NFC", text)


def clean_ascii_for_cv2(text: Any) -> str:
    """
    Sanitizes arbitrary UTF-8 text (including emojis and special symbols) into
    printable ASCII characters (32-126) for OpenCV cv2.putText rendering.
    Prevents cv2.putText crashes or memory corruption with multi-byte characters.
    """
    utf8_str = ensure_utf8(text)
    # Replace common decorative characters with ASCII equivalents
    replacements = {
        "“": '"', "”": '"', "‘": "'", "’": "'", "—": "-", "–": "-", "…": "..."
    }
    for orig, rep in replacements.items():
        utf8_str = utf8_str.replace(orig, rep)
    
    # Filter only printable ASCII characters (ord 32 to 126)
    ascii_chars = [c for c in utf8_str if 32 <= ord(c) <= 126]
    cleaned = "".join(ascii_chars).strip()
    return cleaned if cleaned else "AuraEdit AI"


def extract_continuous_motion_parameters(prompt: Any, motion_style: str = "") -> Dict[str, Any]:
    """
    Extracts continuous parametric camera motion values, 360-degree rotation angles,
    velocity curves, action sequence dynamics, and living element triggers from raw natural language prompts.
    """
    raw_prompt = ensure_utf8(prompt)
    p_lower = raw_prompt.lower()
    
    # 1. 360-Degree and Custom Rotation Angle Parsing
    rotation_yaw_deg = 0.0
    # Check for explicit degree mentions
    deg_match = re.search(r'(-?\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)\b', p_lower)
    if deg_match:
        rotation_yaw_deg = float(deg_match.group(1))
    elif any(k in p_lower for k in ["360", "360-degree", "360-deg", "full rotation", "full circle", "full orbit", "pan around", "orbit around"]):
        rotation_yaw_deg = 360.0
    elif any(k in p_lower for k in ["180", "180-degree", "half turn", "half orbit"]):
        rotation_yaw_deg = 180.0
    elif any(k in p_lower for k in ["720", "720-degree", "double spin"]):
        rotation_yaw_deg = 720.0
    elif "orbit" in p_lower or "orbit_3d" in motion_style.lower():
        rotation_yaw_deg = 360.0

    # Direction check
    if any(k in p_lower for k in ["counter-clockwise", "counter clockwise", "ccw", "left to right", "spin left"]) and rotation_yaw_deg > 0:
        rotation_yaw_deg = -rotation_yaw_deg

    # Pitch & Roll Angles
    rotation_pitch_deg = 0.0
    if any(k in p_lower for k in ["crane up", "tilt up", "look up", "ascending", "ascent"]):
        rotation_pitch_deg = 12.0
    elif any(k in p_lower for k in ["crane down", "tilt down", "look down", "descending"]):
        rotation_pitch_deg = -12.0

    rotation_roll_deg = 0.0
    if any(k in p_lower for k in ["dutch angle", "dutch tilt", "roll angle", "bank"]):
        rotation_roll_deg = 8.0

    # 2. Speed Profile & High-Speed Action Dynamics
    speed_profile = "smooth_ease"
    action_intensity = 0.0
    motion_blur_strength = 0.0

    if any(k in p_lower for k in ["high speed", "high-speed", "action sequence", "action movie", "action-packed", "fast action", "fast-paced", "hyper speed", "whip pan"]):
        speed_profile = "high_speed_action"
        action_intensity = 0.85
        motion_blur_strength = 0.75
    elif any(k in p_lower for k in ["bullet time", "bullet-time", "time dilation", "matrix style", "freeze motion", "hyper-slow"]):
        speed_profile = "bullet_time"
        action_intensity = 0.90
        motion_blur_strength = 0.40
    elif any(k in p_lower for k in ["slow motion", "slow-mo", "slowmo", "dreamy", "ambient", "gentle"]):
        speed_profile = "slow_motion"
        action_intensity = 0.10
        motion_blur_strength = 0.0
    elif any(k in p_lower for k in ["linear", "constant speed"]):
        speed_profile = "linear"

    # Multiplier (e.g. 2x, 3.5x, 0.5x)
    speed_multiplier = 1.0
    mult_match = re.search(r'(\d+(?:\.\d+)?)\s*x\s*(?:speed|velocity)?\b', p_lower)
    if mult_match:
        try:
            speed_multiplier = float(mult_match.group(1))
        except ValueError:
            pass
    elif speed_profile == "high_speed_action":
        speed_multiplier = 2.5

    # 3. Custom Camera Pan & Zoom Vectors
    pan_x = 0.0
    pan_y = 0.0
    if any(k in p_lower for k in ["pan left", "move left", "tracking left"]):
        pan_x = -0.5
    elif any(k in p_lower for k in ["pan right", "move right", "tracking right"]):
        pan_x = 0.5
    elif "pan" in p_lower:
        pan_x = 0.4

    if any(k in p_lower for k in ["tilt up", "move up", "crane up"]):
        pan_y = -0.35
    elif any(k in p_lower for k in ["tilt down", "move down", "crane down"]):
        pan_y = 0.35

    zoom_start = 1.0
    zoom_end = 1.25
    if any(k in p_lower for k in ["zoom out", "pull back", "pull out", "wide angle"]):
        zoom_start = 1.35
        zoom_end = 1.02
    elif any(k in p_lower for k in ["zoom in", "push in", "close up", "dramatic zoom", "whip zoom"]):
        zoom_start = 1.02
        zoom_end = 1.45 if speed_profile == "high_speed_action" else 1.30
    elif any(k in p_lower for k in ["dolly zoom", "vertigo", "hitchcock"]):
        zoom_start = 1.0
        zoom_end = 1.42

    # 4. Prompt-Specified Environmental & Dynamic Elements
    living_stars = ("✨" in raw_prompt) or any(k in p_lower for k in ["star", "sky", "twinkle", "celestial", "galaxy", "night sky", "nebula"])
    living_water = ("🌊" in raw_prompt) or any(k in p_lower for k in ["water", "sea", "ocean", "wave", "lake", "river", "coastal", "aquatic"])
    volumetric_lighting = any(k in p_lower for k in ["light sweep", "sunbeam", "god ray", "volumetric", "sunlight", "moonlight", "beam"])
    chromatic_pulse = ("⚡" in raw_prompt) or any(k in p_lower for k in ["cyber", "neon", "pulse", "cyberpunk", "glow", "chromatic"])

    return {
        "rotation_yaw_deg": rotation_yaw_deg,
        "rotation_pitch_deg": rotation_pitch_deg,
        "rotation_roll_deg": rotation_roll_deg,
        "speed_profile": speed_profile,
        "speed_multiplier": speed_multiplier,
        "action_intensity": action_intensity,
        "motion_blur_strength": motion_blur_strength,
        "pan_x": pan_x,
        "pan_y": pan_y,
        "zoom_start": zoom_start,
        "zoom_end": zoom_end,
        "living_stars": living_stars,
        "living_water": living_water,
        "volumetric_lighting": volumetric_lighting,
        "chromatic_pulse": chromatic_pulse
    }


def parse_motion_prompt(prompt: Any, default_style: str = "google_flow_cinematic") -> Dict[str, Any]:
    """
    Parses complex multi-modal prompt instructions containing:
    - Special characters & UTF-8 emojis (🏛️, 🌊, ✨, 🎥, ⚡, 🎬, 🎵)
    - Continuous parametric motion instructions (360-degree rotations, high-speed action, zoom, pan, pitch)
    - BGM audio tags (e.g. `[BGM: cinematic_ambient]`, `[BGM: 🎵 lo_fi_waves]`, `bgm: ...`)
    - Motion tags & trajectory directives (e.g. `[Motion: 360-Degree Rotation High-Speed Action]`)
    - Duration specifications (e.g. `4s`, `6.0 sec`)
    
    Returns a structured dictionary of extracted parametric directives with UTF-8 fidelity.
    """
    raw_prompt = ensure_utf8(prompt)
    
    # 1. Extract BGM tag
    bgm_tag = None
    bgm_match = re.search(r'\[BGM:\s*([^\]]+)\]', raw_prompt, re.IGNORECASE)
    if bgm_match:
        bgm_tag = ensure_utf8(bgm_match.group(1).strip())
    else:
        bgm_inline = re.search(r'\bbgm:\s*([\w\-]+)', raw_prompt, re.IGNORECASE)
        if bgm_inline:
            bgm_tag = ensure_utf8(bgm_inline.group(1).strip())

    # 2. Extract explicit Motion tag
    motion_tag = None
    motion_match = re.search(r'\[Motion:\s*([^\]]+)\]', raw_prompt, re.IGNORECASE)
    if motion_match:
        motion_tag = ensure_utf8(motion_match.group(1).strip())

    # 3. Extract Duration
    duration = None
    dur_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)\b', raw_prompt, re.IGNORECASE)
    if dur_match:
        try:
            duration = float(dur_match.group(1))
        except ValueError:
            pass

    # 4. Continuous Trajectory Parameters
    continuous_params = extract_continuous_motion_parameters(raw_prompt, default_style)

    # 5. Descriptive Motion Label & Style Description dynamically derived from prompt
    p_lower = raw_prompt.lower()
    descriptors = []
    if continuous_params["rotation_yaw_deg"] != 0.0:
        descriptors.append(f"{abs(int(continuous_params['rotation_yaw_deg']))}° Rotation")
    if continuous_params["speed_profile"] == "high_speed_action":
        descriptors.append("High-Speed Action")
    elif continuous_params["speed_profile"] == "bullet_time":
        descriptors.append("Bullet-Time Action")
    elif continuous_params["speed_profile"] == "slow_motion":
        descriptors.append("Slow-Motion Cinematic")
    
    if continuous_params["living_stars"]:
        descriptors.append("Living Stars")
    if continuous_params["living_water"]:
        descriptors.append("Ocean Waves")
    if continuous_params["chromatic_pulse"]:
        descriptors.append("Cyberpunk Pulse")

    if motion_tag:
        motion_label = motion_tag
        resolved_style = motion_tag.lower().replace(" ", "_")
    elif "orbit" in p_lower or "orbit_3d" in (default_style or "").lower():
        resolved_style = "orbit_3d"
        motion_label = "3D Orbit Around Subject"
    elif descriptors:
        motion_label = " + ".join(descriptors)
        resolved_style = "_".join([d.lower().replace(" ", "_").replace("°", "deg") for d in descriptors])
    else:
        motion_label = "Prompt-Driven Parametric Trajectory"
        resolved_style = "prompt_driven_dynamic"

    # Extract emojis present in prompt (both astral plane and BMP symbol emojis)
    emojis = re.findall(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u200d\ufe0f]', raw_prompt)

    return {
        "prompt": raw_prompt,
        "bgm": bgm_tag,
        "motion_style": resolved_style,
        "motion_label": motion_label,
        "motion_tag": motion_tag,
        "duration": duration,
        "emojis": emojis,
        "has_special_characters": any(ord(c) > 127 for c in raw_prompt),
        "parameters": continuous_params
    }
