import os
import re
import json
import uuid
import time
from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END, START
from app.config import settings
from app.utils.utf8_utils import init_utf8_environment, ensure_utf8, parse_motion_prompt

init_utf8_environment()

# ================================================================
# SESSION MEMORY STORE
# ================================================================
# In-memory dictionary holding multi-turn conversation states & cross-workspace memory
SESSION_MEMORY_STORE: Dict[str, Dict[str, Any]] = {}


class ChatOrchestratorState(TypedDict):
    session_id: str
    messages: List[Dict[str, Any]]
    current_input: str
    media_type: str
    media_url: Optional[str]
    thumbnail_url: Optional[str]
    workspace: Optional[str]
    intent: str
    needs_clarification: bool
    clarifying_questions: List[Dict[str, Any]]
    extracted_parameters: Dict[str, Any]
    response_text: str
    action_chips: List[str]
    execution_ready: bool
    execution_payload: Optional[Dict[str, Any]]
    video_url: Optional[str]


def _extract_text_keywords(text: str) -> Dict[str, bool]:
    utf_text = ensure_utf8(text)
    t = utf_text.lower()
    return {
        "is_make_video": any(k in t for k in [
            "make a photo into video", "make photo into video", "photo to video",
            "image to video", "photo into video", "make this a video", "animate",
            "turn into video", "generate video", "create video", "animate this",
            "video from photo", "make video", "convert to video"
        ]),
        "is_360_rotation": any(k in t for k in ["360", "360-degree", "360 degree", "360°", "360 rotation", "full rotation", "spin 360", "rotate 360", "full orbit"]),
        "is_high_speed": any(k in t for k in ["high speed", "high-speed", "action sequence", "action movie", "whip pan", "action-packed", "fast action", "fast-paced"]),
        "is_bullet_time": any(k in t for k in ["bullet time", "bullet-time", "time dilation", "matrix style", "freeze motion"]),
        "is_orbit": "🏛" in utf_text or any(k in t for k in ["orbit", "around the house", "pan around", "around subject", "3d orbit", "orbit 3d", "3d camera"]),
        "is_stars": "✨" in utf_text or any(k in t for k in ["star", "sky", "twinkle", "celestial", "galaxy", "night sky", "living sky"]),
        "is_water": "🌊" in utf_text or any(k in t for k in ["water", "sea", "ocean", "wave", "flowing water", "living ocean", "river"]),
        "is_dolly": "🎥" in utf_text or any(k in t for k in ["dolly", "vertigo", "hitchcock", "zoom pull", "dolly zoom"]),
        "is_cyber": "⚡" in utf_text or any(k in t for k in ["cyber", "neon", "pulse", "cyberpunk", "glow"]),
        "is_pan": any(k in t for k in ["pan", "zoom", "ken burns", "slide", "cinematic pan", "tilt", "crane"]),
        "is_generative_fill": any(k in t for k in ["generative fill", "inpaint", "add ", "insert ", "fill "]),
        "is_remove_bg": any(k in t for k in ["remove background", "remove bg", "isolate subject", "transparent background"]),
        "is_facial_lock": any(k in t for k in ["facial", "face lock", "face consistency", "strict face", "identity"]),
    }


# ================================================================
# LANGGRAPH NODES
# ================================================================

def analyze_intent_node(state: ChatOrchestratorState) -> ChatOrchestratorState:
    """Node 1: Analyze user input, workspace context, and session history to extract continuous motion parameters."""
    user_input = ensure_utf8(state.get("current_input", "")).strip()
    session_id = state.get("session_id", "default_session")

    flags = _extract_text_keywords(user_input)
    stored = SESSION_MEMORY_STORE.get(session_id, {})
    accumulated_params = stored.get("extracted_parameters", {}).copy()

    # Parse rich motion prompt attributes and continuous parameters
    parsed_prompt_info = parse_motion_prompt(user_input)
    if parsed_prompt_info.get("bgm"):
        accumulated_params["bgm"] = parsed_prompt_info["bgm"]
    if parsed_prompt_info.get("duration") is not None:
        accumulated_params["duration"] = parsed_prompt_info["duration"]
    
    continuous_params = parsed_prompt_info.get("parameters", {})
    accumulated_params.update(continuous_params)
    accumulated_params["motion_style"] = parsed_prompt_info["motion_style"]
    accumulated_params["motion_label"] = parsed_prompt_info["motion_label"]
    accumulated_params["motion_instructions"] = parsed_prompt_info.get("motion_tag") or parsed_prompt_info["motion_label"]

    # Determine intent
    if (flags["is_make_video"] or flags["is_360_rotation"] or flags["is_high_speed"] or 
        flags["is_bullet_time"] or flags["is_orbit"] or flags["is_stars"] or 
        flags["is_water"] or flags["is_dolly"] or flags["is_cyber"] or 
        parsed_prompt_info.get("motion_tag")):
        intent = "image_to_video"
    elif flags["is_generative_fill"]:
        intent = "generative_fill"
    elif flags["is_remove_bg"]:
        intent = "remove_background"
    elif state.get("media_type") == "video":
        intent = "video_edit"
    else:
        intent = "general_image_edit"

    # Evaluate if clarification is needed:
    # If the user only gave a vague request (e.g. "make video" or "animate this") without specifying
    # rotation degrees, action pacing, trajectory, or living elements, ask clarifying questions.
    # If the user specified concrete instructions (e.g., 360-degree rotation, high-speed action, or living elements),
    # proceed directly to execution.
    needs_clarification = False
    if intent == "image_to_video":
        has_concrete_direction = any([
            flags["is_360_rotation"],
            flags["is_high_speed"],
            flags["is_bullet_time"],
            flags["is_orbit"],
            flags["is_stars"],
            flags["is_water"],
            flags["is_dolly"],
            flags["is_cyber"],
            flags["is_pan"],
            parsed_prompt_info.get("motion_tag") is not None,
            continuous_params.get("rotation_yaw_deg", 0) != 0,
            continuous_params.get("speed_profile") in ("high_speed_action", "bullet_time")
        ])
        if not has_concrete_direction:
            needs_clarification = True

    state["intent"] = intent
    state["needs_clarification"] = needs_clarification
    state["extracted_parameters"] = accumulated_params
    return state


def formulate_clarification_node(state: ChatOrchestratorState) -> ChatOrchestratorState:
    """Node 2: Formulate targeted clarifying questions to guide prompt formulation and custom trajectory refinement."""
    if not state.get("needs_clarification"):
        return state

    clarifying_questions = [
        {
            "id": "q_camera_motion",
            "category": "Camera Trajectory & Rotation",
            "question": "What 3D camera trajectory and perspective movement would you like for this photo?",
            "options": [
                "🔄 360-Degree Continuous Rotation (Full Orbital Sweep)",
                "🏛️ 3D Pan Around the Subject",
                "⚡ High-Speed Action Sequence (Dynamic Whip Pan)",
                "⏱️ Bullet-Time Action (Time Dilation)",
                "🎥 Hitchcock Dolly Zoom (Vertigo)",
                "✨ Living Celestial Stars & Twinkling Sky"
            ]
        },
        {
            "id": "q_action_pacing",
            "category": "Pacing & Dynamics",
            "question": "Which action dynamics and velocity profile best match your creative vision?",
            "options": [
                "⚡ High-Speed Action with Directional Motion Blur",
                "⏱️ Bullet-Time Dramatic Slow Motion",
                "🎬 Smooth Cinematic Ease-In-Out (Default)",
                "🌙 Extended Ambient Slow-Motion"
            ]
        },
        {
            "id": "q_dynamic_elements",
            "category": "Living Environmental Elements",
            "question": "Which dynamic environmental elements should be animated in the scene?",
            "options": [
                "✨ Twinkling Night Stars & Sky Glow",
                "🌊 Living Hydrodynamic Ocean Waves",
                "💨 Volumetric Lighting / Sunbeam Sweep",
                "⚡ Cyberpunk Chromatic Pulse"
            ]
        }
    ]

    response_text = (
        "I can transform your photo into an ultra-sharp, high-definition video using the **Parametric Dynamic Rendering Pipeline** "
        f"powered by `{getattr(settings, 'VIDEO_AI_MODEL', 'gemini-omni-1.1-flash')}`. "
        "\n\nTo ensure the video generation strictly follows your exact instructions with zero generic presets, please refine your desired trajectory and action dynamics:"
    )

    action_chips = [
        "🔄 360-Degree Rotation",
        "⚡ High-Speed Action Sequence",
        "🏛️ Pan around the House (3D)",
        "✨ Living Sky & Twinkling Stars",
        "🌊 Flowing Ocean Waves",
        "⏱️ Bullet-Time Action"
    ]

    state["clarifying_questions"] = clarifying_questions
    state["response_text"] = response_text
    state["action_chips"] = action_chips
    state["execution_ready"] = False
    return state


def compile_execution_node(state: ChatOrchestratorState) -> ChatOrchestratorState:
    """Node 3: Compile prompt-driven continuous execution instructions when parameters are clear."""
    if state.get("needs_clarification"):
        return state

    intent = state.get("intent", "image_to_video")
    params = state.get("extracted_parameters", {})
    user_input = ensure_utf8(state.get("current_input", ""))
    motion_style = params.get("motion_style", "prompt_driven_dynamic")
    motion_label = params.get("motion_label", "Prompt-Driven Parametric Trajectory")
    motion_instructions = params.get("motion_instructions", motion_label)
    bgm_tag = params.get("bgm")
    duration = params.get("duration", 4.0)

    if intent == "image_to_video":
        refined_prompt = user_input if user_input else f"Cinematic {motion_label} video synthesis."
        if bgm_tag and f"[BGM:" not in refined_prompt:
            refined_prompt = f"{refined_prompt} [BGM: {bgm_tag}]"

        bgm_line = f"\n• **BGM Soundtrack:** `🎵 {bgm_tag}`" if bgm_tag else ""
        
        rot_deg = params.get("rotation_yaw_deg", 0.0)
        rot_line = f"\n• **Continuous Rotation:** {abs(int(rot_deg))}° ({'Counter-Clockwise' if rot_deg < 0 else 'Clockwise'})" if rot_deg != 0 else ""
        speed_prof = params.get("speed_profile", "smooth_ease")
        speed_line = f"\n• **Speed Dynamics:** {speed_prof.replace('_', ' ').title()}" if speed_prof != "smooth_ease" else ""
        
        response_text = (
            f"🎬 **Prompt-Driven Video Generation Formulated!**\n\n"
            f"• **Trajectory Mode:** {motion_label}{rot_line}{speed_line}\n"
            f"• **AI Model Endpoint:** `{getattr(settings, 'VIDEO_AI_MODEL', 'gemini-omni-1.1-flash')}`\n"
            f"• **Rendering:** HD 1080p Anti-Aliased Sub-Pixel H.264 MP4 @ 30FPS\n"
            f"• **Duration:** {duration}s{bgm_line}\n"
            f"• **Prompt Instruction:** \"{refined_prompt}\"\n\n"
            f"Executing custom parametric camera synthesis and rendering video output..."
        )

        state["response_text"] = response_text
        state["execution_ready"] = True
        state["execution_payload"] = {
            "action": "image_to_video",
            "prompt": refined_prompt,
            "motion_style": motion_style,
            "motion_label": motion_label,
            "motion_instructions": motion_instructions,
            "bgm": bgm_tag,
            "duration": duration,
            "parameters": params
        }
        state["action_chips"] = [
            "Regenerate 360° Rotation",
            "Regenerate High-Speed Action",
            "Add Living Celestial Stars",
            "Add Ocean Waves"
        ]
    elif intent == "generative_fill":
        state["response_text"] = (
            f"🎨 **Generative Fill Prepared:** Applying `{getattr(settings, 'IMAGE_GENERATION_MODEL', 'gemini-3.1-flash-image')}` "
            f"for prompt: \"{user_input}\"."
        )
        state["execution_ready"] = True
        state["execution_payload"] = {
            "action": "generative_fill",
            "prompt": user_input
        }
    else:
        state["response_text"] = (
            f"⚡ **AI Editing Plan Configured:** Formulated editing pipeline for: \"{user_input}\"."
        )
        state["execution_ready"] = True
        state["execution_payload"] = {
            "action": "apply_edits",
            "prompt": user_input
        }

    return state


def update_memory_node(state: ChatOrchestratorState) -> ChatOrchestratorState:
    """Node 4: Persist the multi-turn session and cross-workspace memory."""
    session_id = state.get("session_id", "default_session")
    
    # Store or update session memory across turns and workspaces
    SESSION_MEMORY_STORE[session_id] = {
        "extracted_parameters": state.get("extracted_parameters", {}),
        "intent": state.get("intent"),
        "last_updated": time.time(),
        "thumbnail_url": state.get("thumbnail_url"),
        "media_url": state.get("media_url"),
        "media_type": state.get("media_type"),
        "workspace": state.get("workspace")
    }
    return state


# ================================================================
# BUILD LANGGRAPH STATE GRAPH
# ================================================================

graph_builder = StateGraph(ChatOrchestratorState)

graph_builder.add_node("analyze_intent", analyze_intent_node)
graph_builder.add_node("formulate_clarification", formulate_clarification_node)
graph_builder.add_node("compile_execution", compile_execution_node)
graph_builder.add_node("update_memory", update_memory_node)

graph_builder.add_edge(START, "analyze_intent")
graph_builder.add_edge("analyze_intent", "formulate_clarification")
graph_builder.add_edge("formulate_clarification", "compile_execution")
graph_builder.add_edge("compile_execution", "update_memory")
graph_builder.add_edge("update_memory", END)

chat_graph = graph_builder.compile()


class ChatOrchestrator:
    """Multi-turn conversational orchestrator leveraging LangGraph and cross-workspace memory."""

    @staticmethod
    def process_turn(
        user_input: str,
        session_id: str = "default_session",
        media_type: str = "image",
        media_url: Optional[str] = None,
        thumbnail_url: Optional[str] = None,
        workspace: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Execute a conversational turn through the LangGraph state machine."""
        initial_state: ChatOrchestratorState = {
            "session_id": session_id,
            "messages": history or [],
            "current_input": user_input,
            "media_type": media_type,
            "media_url": media_url,
            "thumbnail_url": thumbnail_url,
            "workspace": workspace or media_type,
            "intent": "general_query",
            "needs_clarification": False,
            "clarifying_questions": [],
            "extracted_parameters": {},
            "response_text": "",
            "action_chips": [],
            "execution_ready": False,
            "execution_payload": None,
            "video_url": None
        }

        result_state = chat_graph.invoke(initial_state)

        return {
            "session_id": session_id,
            "message": result_state.get("response_text", ""),
            "intent": result_state.get("intent", "general_query"),
            "needs_clarification": result_state.get("needs_clarification", False),
            "clarifying_questions": result_state.get("clarifying_questions", []),
            "action_chips": result_state.get("action_chips", []),
            "execution_ready": result_state.get("execution_ready", False),
            "execution_payload": result_state.get("execution_payload"),
            "thumbnail_url": thumbnail_url,
            "video_model": getattr(settings, "VIDEO_AI_MODEL", "gemini-omni-1.1-flash"),
            "image_model": getattr(settings, "IMAGE_GENERATION_MODEL", "gemini-3.1-flash-image"),
            "timestamp": time.strftime("%I:%M %p")
        }


chat_orchestrator = ChatOrchestrator()

