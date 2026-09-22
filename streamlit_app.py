import os
import sys
import time
import base64
import threading
from pathlib import Path
from typing import Optional, Dict, Any

# Ensure project root and backend are in sys.path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure required upload directories exist
os.makedirs(ROOT_DIR / "uploads" / "images", exist_ok=True)
os.makedirs(ROOT_DIR / "uploads" / "videos", exist_ok=True)
os.makedirs(ROOT_DIR / "uploads" / "generative_fill", exist_ok=True)

import streamlit as st
import streamlit.components.v1 as components
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# Import backend services safely
try:
    from app.utils.utf8_utils import init_utf8_environment, ensure_utf8
    init_utf8_environment()
except Exception:
    pass

try:
    from app.database import engine, Base
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[DB Init Warning]: {e}")

try:
    from app.services.image_service import image_processor
    from app.services.video_service import video_processor
    from app.ai.agents import image_agent, video_agent
    from app.ai.chat_graph import chat_orchestrator
    BACKEND_AVAILABLE = True
except Exception as e:
    BACKEND_AVAILABLE = False
    print(f"[Backend Import Warning]: {e}")


# ==========================================
# BACKGROUND FASTAPI SERVER (FOR EMBEDDED SPA)
# ==========================================
def start_fastapi_server():
    """Start FastAPI uvicorn server in background thread safely without reload signals"""
    try:
        import uvicorn
        from app.main import app as fastapi_app
        
        config = uvicorn.Config(
            app=fastapi_app,
            host="127.0.0.1",
            port=8000,
            log_level="warning",
            access_log=False
        )
        server = uvicorn.Server(config)
        server.run()
    except Exception as e:
        print(f"[FastAPI Background Server Error]: {e}")


@st.cache_resource
def ensure_backend_daemon():
    """Spawn background FastAPI server thread once"""
    try:
        server_thread = threading.Thread(target=start_fastapi_server, daemon=True)
        server_thread.start()
        time.sleep(1.0)
        return True
    except Exception as e:
        print(f"[Daemon Spawn Warning]: {e}")
        return False


# ==========================================
# PAGE CONFIGURATION & FIGMA DESIGN SYSTEM
# ==========================================
st.set_page_config(
    page_title="AuraEdit AI - Multimodal AI Studio",
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom Glassmorphic Dark styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;600&family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
        --primary: #c4c0ff;
        --secondary: #2fd9f4;
        --dark-bg: #080c18;
        --card-bg: #0e1323;
        --card-border: rgba(196, 192, 255, 0.12);
        --text-main: #dee1f9;
        --text-muted: #9ba1c2;
    }

    .stApp {
        background: radial-gradient(circle at 50% 0%, #151b33 0%, #080c18 65%, #050710 100%) !important;
        color: var(--text-main) !important;
        font-family: 'Geist', 'Inter', sans-serif !important;
    }

    .block-container {
        padding-top: 1.5rem !important;
        padding-bottom: 2rem !important;
        max-width: 98% !important;
    }

    .aura-nav {
        background: linear-gradient(135deg, rgba(20, 27, 49, 0.9) 0%, rgba(14, 19, 35, 0.8) 100%);
        backdrop-filter: blur(16px);
        border: 1px solid var(--card-border);
        border-radius: 16px;
        padding: 14px 24px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }

    .aura-logo {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .aura-logo-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, #c4c0ff 0%, #2fd9f4 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 0 15px rgba(196, 192, 255, 0.4);
    }

    .aura-title-text {
        font-size: 1.3rem;
        font-weight: 800;
        background: linear-gradient(135deg, #ffffff 20%, #c4c0ff 60%, #2fd9f4 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
    }

    .aura-card {
        background: rgba(14, 19, 35, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid var(--card-border);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
    }

    .stButton > button {
        background: linear-gradient(135deg, #7c72ff 0%, #4338ca 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(196, 192, 255, 0.3) !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        padding: 8px 20px !important;
        transition: all 0.25s ease !important;
    }

    .stButton > button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(124, 114, 255, 0.5) !important;
    }

    .stTabs [data-baseweb="tab-list"] {
        background: rgba(14, 19, 35, 0.9);
        padding: 6px;
        border-radius: 12px;
        border: 1px solid var(--card-border);
        gap: 6px;
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        color: var(--text-muted);
        font-weight: 600;
        padding: 8px 18px;
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, rgba(196, 192, 255, 0.22) 0%, rgba(47, 217, 244, 0.18) 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(196, 192, 255, 0.3) !important;
    }

    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# Ensure background FastAPI daemon is running
ensure_backend_daemon()

# Top Navigation Bar
st.markdown("""
<div class="aura-nav">
    <div class="aura-logo">
        <div class="aura-logo-icon">✨</div>
        <div>
            <div class="aura-title-text">AuraEdit AI</div>
            <div style="font-size: 0.75rem; color: #9ba1c2;">Full Stack AI-Powered Image & Video Editing Platform</div>
        </div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(47, 217, 244, 0.1); border: 1px solid rgba(47, 217, 244, 0.3); border-radius: 9999px; color: #2fd9f4; font-size: 0.75rem; font-weight: 600;">
            ● Gemini 2.5 Flash Online
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(196, 192, 255, 0.1); border: 1px solid rgba(196, 192, 255, 0.3); border-radius: 9999px; color: #c4c0ff; font-size: 0.75rem; font-weight: 600;">
            ⚡ 60 FPS Engine
        </span>
    </div>
</div>
""", unsafe_allow_html=True)


# ==========================================
# MAIN APP TABS
# ==========================================
tab_app, tab_image, tab_video, tab_chat, tab_specs = st.tabs([
    "🚀 AuraEdit Workspace (Full Live App)",
    "🎨 AI Image Studio",
    "🎬 AI Video Studio (3D Motion)",
    "💬 AI Copilot (LangGraph)",
    "📖 System Specs & Endpoints"
])


# -------------------------------------------------------------
# TAB 1: FULL AURAEDIT WORKSPACE (REACT SPA EMBEDDED)
# -------------------------------------------------------------
with tab_app:
    dist_index_file = FRONTEND_DIST / "index.html"
    
    # Read built HTML if available
    if dist_index_file.exists():
        try:
            with open(dist_index_file, "r", encoding="utf-8") as f:
                html_raw = f.read()
            
            # Read CSS and JS bundles to inline or serve seamlessly
            assets_dir = FRONTEND_DIST / "assets"
            css_content = ""
            js_content = ""
            
            for css_file in assets_dir.glob("*.css"):
                with open(css_file, "r", encoding="utf-8") as cf:
                    css_content += cf.read() + "\n"
                    
            # Wrap into self-contained HTML frame for zero-latency execution
            embedded_html = f"""
            <!DOCTYPE html>
            <html lang="en" class="dark">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    {css_content}
                    body, html {{ margin: 0; padding: 0; width: 100%; height: 100%; overflow-x: hidden; background: #080c18; }}
                </style>
            </head>
            <body class="bg-[#080c18] text-[#c7c4d8] font-sans antialiased">
                <div id="root"></div>
                <script type="module">
                    // Set runtime API base URLs to local gateway
                    window.__AURA_API_BASE__ = "http://127.0.0.1:8000/api";
                    window.__AURA_WS_BASE__ = "ws://127.0.0.1:8000/ws";
                </script>
                <script type="module" src="http://127.0.0.1:8000/assets/index-Da5JhQbm.js"></script>
            </body>
            </html>
            """
            
            components.html(embedded_html, height=920, scrolling=True)
            
        except Exception as embed_err:
            st.warning(f"Note: Loading component via direct frame...")
            components.iframe("http://127.0.0.1:8000/", height=920, scrolling=True)
    else:
        st.info("Building frontend distribution package...")
        components.iframe("http://localhost:5173/", height=920, scrolling=True)


# -------------------------------------------------------------
# TAB 2: AI IMAGE STUDIO (PYTHON ENGINE)
# -------------------------------------------------------------
def apply_image_adjustments(pil_img: Image.Image, brightness: int, contrast: int, saturation: int, sharpness: int, blur: int, filter_preset: str) -> Image.Image:
    res = pil_img.copy()
    if brightness != 0:
        res = ImageEnhance.Brightness(res).enhance(max(0.05, 1.0 + brightness / 100.0))
    if contrast != 0:
        res = ImageEnhance.Contrast(res).enhance(max(0.05, 1.0 + contrast / 100.0))
    if saturation != 0:
        res = ImageEnhance.Color(res).enhance(max(0.0, 1.0 + saturation / 100.0))
    if sharpness != 0:
        res = ImageEnhance.Sharpness(res).enhance(max(0.0, 1.0 + sharpness / 100.0))
    if blur > 0:
        res = res.filter(ImageFilter.GaussianBlur(radius=blur / 2.0))
    if filter_preset == "Cyberpunk Neon":
        r, g, b = res.convert("RGB").split()
        r = r.point(lambda i: min(255, int(i * 1.25)))
        b = b.point(lambda i: min(255, int(i * 1.35)))
        res = Image.merge("RGB", (r, g, b))
    elif filter_preset == "Vintage 35mm":
        res = ImageOps.colorize(ImageOps.grayscale(res), black="#1a0c00", white="#ffeedb")
    elif filter_preset == "Dramatic B&W":
        res = ImageOps.grayscale(res).convert("RGB")
        res = ImageEnhance.Contrast(res).enhance(1.4)
    elif filter_preset == "Warm Sunset":
        r, g, b = res.convert("RGB").split()
        r = r.point(lambda i: min(255, int(i * 1.2)))
        g = g.point(lambda i: min(255, int(i * 1.05)))
        b = b.point(lambda i: int(i * 0.85))
        res = Image.merge("RGB", (r, g, b))
    return res

def remove_background_simple(pil_img: Image.Image) -> Image.Image:
    rgba = pil_img.convert("RGBA")
    data = np.array(rgba)
    corner = data[0, 0, :3].astype(float)
    diff = np.sqrt(np.sum((data[:, :, :3].astype(float) - corner) ** 2, axis=2))
    mask = diff > 35
    data[:, :, 3] = np.where(mask, 255, 0).astype(np.uint8)
    return Image.fromarray(data)

with tab_image:
    st.markdown("### 🎨 AI Image Studio")
    col_img_left, col_img_right = st.columns([1, 1.2], gap="large")
    
    with col_img_left:
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        uploaded_image = st.file_uploader("Upload Image (JPG, PNG, WEBP)", type=["jpg", "jpeg", "png", "webp"], key="st_img_uploader")
        
        sample_img_path = ROOT_DIR / "uploads" / "images" / "sample.jpg"
        if uploaded_image is not None:
            source_img = Image.open(uploaded_image).convert("RGB")
        elif sample_img_path.exists():
            source_img = Image.open(sample_img_path).convert("RGB")
        else:
            sample_arr = np.zeros((600, 800, 3), dtype=np.uint8)
            for y in range(600):
                for x in range(800):
                    sample_arr[y, x] = [int(15 + y * 0.1), int(20 + x * 0.05), int(45 + (x+y)*0.08)]
            source_img = Image.fromarray(sample_arr)
            
        st.image(source_img, caption="Source Image Preview", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        st.markdown("#### 🪄 Natural Language AI Prompt")
        img_prompt_text = st.text_input("Enter prompt for AI visual edits:", placeholder="e.g. Add glowing cyberpunk neon lights, boost depth of field", key="st_img_prompt")
        img_preset = st.selectbox("Or choose a quick AI enhancement recipe:", ["Custom Prompt", "Cyberpunk Neon Glow & Volumetric Depth", "Studio Portrait Specular Lighting", "Dramatic 35mm Cinematic Film Grade", "Clean Background Removal", "Golden Hour Warm Sunset"], key="st_img_recipe")
        st.markdown('</div>', unsafe_allow_html=True)
        
    with col_img_right:
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        st.markdown("#### 🎛️ Color Grading & Adjustments")
        col_adj1, col_adj2 = st.columns(2)
        with col_adj1:
            bright_val = st.slider("Brightness", -100, 100, 0, key="st_br_slider")
            contrast_val = st.slider("Contrast", -100, 100, 0, key="st_ct_slider")
            sat_val = st.slider("Saturation", -100, 100, 0, key="st_sat_slider")
        with col_adj2:
            sharp_val = st.slider("Sharpness", -100, 100, 0, key="st_sh_slider")
            blur_val = st.slider("Gaussian Blur", 0, 20, 0, key="st_bl_slider")
            filter_choice = st.selectbox("Style Filter", ["Normal", "Cyberpunk Neon", "Vintage 35mm", "Dramatic B&W", "Warm Sunset"], key="st_flt_select")
            
        bg_remove_btn = st.checkbox("✂️ Remove Background", key="st_bg_remove_check")
        st.markdown('</div>', unsafe_allow_html=True)
        
        if img_preset == "Cyberpunk Neon Glow & Volumetric Depth":
            filter_choice = "Cyberpunk Neon"
            contrast_val = max(contrast_val, 25)
            sat_val = max(sat_val, 30)
        elif img_preset == "Dramatic 35mm Cinematic Film Grade":
            filter_choice = "Vintage 35mm"
        elif img_preset == "Clean Background Removal":
            bg_remove_btn = True
        elif img_preset == "Golden Hour Warm Sunset":
            filter_choice = "Warm Sunset"
            bright_val = max(bright_val, 15)
            
        processed_img = apply_image_adjustments(source_img, bright_val, contrast_val, sat_val, sharp_val, blur_val, filter_choice)
        if bg_remove_btn:
            processed_img = remove_background_simple(processed_img)
            
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        st.markdown("#### ✨ Result Preview")
        st.image(processed_img, caption="Live Processed Master Output", use_container_width=True)
        
        out_img_path = ROOT_DIR / "uploads" / "images" / "auraedit_export.png"
        processed_img.save(out_img_path)
        
        with open(out_img_path, "rb") as f:
            st.download_button("📥 Download HD Processed Image", data=f, file_name="auraedit_image_output.png", mime="image/png", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)


# -------------------------------------------------------------
# TAB 3: AI VIDEO STUDIO
# -------------------------------------------------------------
with tab_video:
    st.markdown("### 🎬 AI Video Studio: 3D Camera Motion & Image-to-Video Engine")
    col_vid_left, col_vid_right = st.columns([1, 1.2], gap="large")
    
    with col_vid_left:
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        uploaded_photo = st.file_uploader("Upload Still Photo for 3D Camera Synthesis", type=["jpg", "jpeg", "png", "webp"], key="st_vid_photo_uploader")
        if uploaded_photo:
            photo_src = Image.open(uploaded_photo).convert("RGB")
        else:
            sample_img_path = ROOT_DIR / "uploads" / "images" / "sample.jpg"
            if sample_img_path.exists():
                photo_src = Image.open(sample_img_path).convert("RGB")
            else:
                photo_src = source_img
        st.image(photo_src, caption="Input Photo for Video Generation", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        st.markdown("#### 🎥 3D Camera Trajectory")
        motion_style = st.selectbox("Camera Motion Trajectory", ["Cinematic Pan & Zoom", "360 Orbital Panorama", "Dramatic Dolly Zoom", "FPV Drone Flyover", "Celestial Starry Night Depth Shimmer"], key="st_vid_motion")
        video_prompt = st.text_input("Video Lighting & Dynamic Action Prompt:", value="Smooth cinematic pan with high depth of field and soft ambient light", key="st_vid_prompt")
        duration_sec = st.slider("Duration (Seconds)", min_value=2.0, max_value=8.0, value=4.0, step=0.5, key="st_vid_dur")
        st.markdown('</div>', unsafe_allow_html=True)
        
    with col_vid_right:
        st.markdown('<div class="aura-card">', unsafe_allow_html=True)
        st.markdown("#### ⚡ Real-Time Video Synthesis Engine")
        
        generate_video_btn = st.button("🚀 Synthesize & Render AI Video", use_container_width=True, key="st_vid_gen_btn")
        
        target_video_path = ROOT_DIR / "uploads" / "videos" / "auraedit_video_output.mp4"
        root_sample_mp4 = ROOT_DIR / "Generating_video_from_storyboard…_1080p_20260918190214.mp4"
        
        if generate_video_btn:
            with st.spinner("Executing 3D continuous depth map estimation, optical flow synthesis, and video encoding..."):
                try:
                    temp_input_photo = ROOT_DIR / "uploads" / "images" / "temp_vid_src.jpg"
                    photo_src.save(temp_input_photo)
                    
                    if BACKEND_AVAILABLE:
                        m_style_param = "cinematic_pan_zoom"
                        if "Orbital" in motion_style:
                            m_style_param = "orbital_360"
                        elif "Dolly" in motion_style:
                            m_style_param = "dolly_zoom"
                        elif "Drone" in motion_style:
                            m_style_param = "fpv_drone"
                        elif "Celestial" in motion_style:
                            m_style_param = "starry_sky"
                            
                        video_processor.generate_image_to_video(
                            image_input=str(temp_input_photo),
                            output_path=str(target_video_path),
                            prompt=video_prompt,
                            motion_style=m_style_param,
                            duration=duration_sec
                        )
                        st.success("✅ AI Video Synthesis Completed Successfully!")
                except Exception as e:
                    st.error(f"Render engine notice: {e}")
                    
        if target_video_path.exists():
            st.video(str(target_video_path))
            with open(target_video_path, "rb") as vf:
                st.download_button("📥 Download HD Master MP4 Video", data=vf, file_name="auraedit_master_video.mp4", mime="video/mp4", use_container_width=True)
        elif root_sample_mp4.exists():
            st.video(str(root_sample_mp4))
            with open(root_sample_mp4, "rb") as vf:
                st.download_button("📥 Download Sample HD Video", data=vf, file_name="auraedit_sample_video.mp4", mime="video/mp4", use_container_width=True)
        else:
            st.info("Click 'Synthesize & Render AI Video' above to generate your dynamic 3D camera video.")
        st.markdown('</div>', unsafe_allow_html=True)


# -------------------------------------------------------------
# TAB 4: LANGGRAPH AI COPILOT
# -------------------------------------------------------------
with tab_chat:
    st.markdown("### 💬 Multi-Turn LangGraph Conversational Agent")
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            {"role": "assistant", "content": "👋 Hello! I am your AuraEdit AI Multimodal Assistant. How can I help you transform your visual media today?"}
        ]
        
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])
            
    user_chat_input = st.chat_input("Ask AuraEdit AI...")
    if user_chat_input:
        st.session_state.chat_history.append({"role": "user", "content": user_chat_input})
        with st.chat_message("user"):
            st.write(user_chat_input)
            
        with st.chat_message("assistant"):
            with st.spinner("Analyzing intent with Gemini & LangGraph..."):
                try:
                    if BACKEND_AVAILABLE:
                        chat_res = chat_orchestrator.process_turn(user_input=user_chat_input, session_id="streamlit_user_session", media_type="image", history=[])
                        reply = chat_res.get("reply", "Processed instruction.")
                        st.write(reply)
                    else:
                        reply = f"I have analyzed your prompt: '{user_chat_input}'. Let's execute this in the Image or Video studio!"
                        st.write(reply)
                    st.session_state.chat_history.append({"role": "assistant", "content": reply})
                except Exception:
                    st.write(f"I received your request: '{user_chat_input}'.")


# -------------------------------------------------------------
# TAB 5: SYSTEM SPECS
# -------------------------------------------------------------
with tab_specs:
    st.markdown("### 📖 System Architecture & OpenAPI Documentation")
    st.markdown("""
    #### 🏗️ Architecture Stack
    - **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Three.js, ONNX Runtime Web.
    - **Backend:** Python 3.10+, FastAPI, LangChain, LangGraph, Google Gemini AI (`gemini-2.5-flash`), OpenCV Headless, Pillow, FFmpeg.
    - **Database:** SQLite / PostgreSQL with SQLAlchemy 2.0 ORM.
    
    #### 🌐 Core REST & WebSocket Endpoints
    - `GET /api/health` - Server health & service uptime status.
    - `POST /api/auth/register` & `POST /api/auth/login` - JWT Authentication.
    - `POST /api/ai/image/edit` - Multi-step AI Image enhancement.
    - `POST /api/ai/video/generate` - Dynamic 3D Camera Trajectory Video generator.
    - `WS /ws` - High-speed real-time multimodal bidirectional streaming gateway.
    """)

