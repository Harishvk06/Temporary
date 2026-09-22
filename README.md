# AuraEdit AI - Full Stack AI-Powered Image & Video Editing Software

**Version:** 1.0.0  
**Framework:** React + TypeScript + Tailwind CSS (Frontend) | Python FastAPI + LangChain + LangGraph + Google Gemini AI (Backend)  
**Status:** Production Ready  

---

## 🌟 Overview

**AuraEdit AI** is a production-ready, intelligent web-based image and video editing platform. Powered by Google Gemini AI (`gemini-2.5-flash`), LangChain, and LangGraph, users can upload media, use natural language prompts to perform complex multi-step edits, and leverage AI agents for professional-grade visual enhancements.

---

## 📐 Figma Design System Specs
- **Color Palette:**
  - Primary: `#c4c0ff` (Purple gradient)
  - Secondary: `#2fd9f4` (Cyan gradient)
  - Accent: `#dee1f9` (Light purple text)
  - Dark: `#0e1323` (Dark background)
  - Darker: `#080c18` (Very dark background)
- **Typography:** Geist & Geist Mono
- **Effects:** Backdrop blur `6px`, Glassmorphism, Gradient borders, Shadow `0px 25px 50px -12px rgba(0, 0, 0, 0.25)`.

---

## 🏗️ Project Architecture

```
IV SOFT/
├── frontend/                     # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/                  # Axios HTTP API services
│   │   ├── components/           # Canvas, Toolbar, PromptBar, Timeline, PreviewPane, etc.
│   │   ├── context/              # AuthContext provider
│   │   ├── hooks/                # useAuth, useWebSocket, useCanvas, useDebounce
│   │   ├── pages/                # LandingPage, Dashboard, ImageEditor, VideoEditor, Login, Register, Profile, NotFound
│   │   ├── styles/               # index.css & animations.css (Glassmorphism design system)
│   │   ├── types/                # TypeScript interface definitions
│   │   └── utils/                # Constants, formatters, validators
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                      # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                  # Auth, Users, Projects, Images, Videos, AI, Health routers
│   │   ├── ai/                   # ImageEditingAgent, VideoEditingAgent, LangGraph workflows, Gemini tools
│   │   ├── models/               # SQLAlchemy Models (User, Project, Image, Video, EditHistory, APIKey)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Auth, Image, Video, Storage, and AI services
│   │   ├── config.py             # App configuration
│   │   ├── database.py           # SQLAlchemy session setup
│   │   ├── main.py               # FastAPI app & WebSocket endpoint (/ws)
│   │   └── security.py           # JWT & Bcrypt password hashing
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── database/                     # Schemas & DDL
│   ├── postgres_schema.sql       # PostgreSQL DDL
│   └── mongodb_schema.json       # MongoDB JSON validation schema
│
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ and npm
- Python 3.10+
- Google Gemini API Key

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Set your GEMINI_API_API_KEY in .env

# Run FastAPI Server
python main.py
```
FastAPI server will run on `http://localhost:8000`. API Docs available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend app will run on `http://localhost:5173`.

---

## 🐳 Docker Deployment

```bash
cd backend
docker-compose up --build
```

---

## 🎯 Features Implemented

1. **Landing Page**: Glassmorphism navigation bar, 50/50 split hero with headline, CTA buttons, floating cards ("Magic Sparkles", "AI Chips"), live dashboard mockup, 3 feature cards, CTA section, and footer.
2. **Dashboard**: User analytics stats (Total Edits, Credits Used, Credits Remaining in cyan), responsive project grid, search & filter toolbar, drag & drop media file upload modal.
3. **Image Editor**: Resizable canvas with zoom/pan controls, grid overlays, rotation/flip, left toolbar (crop, rotate, stamp, picker, text, layers), right sidebar properties sliders (brightness, contrast, saturation, temperature), bottom glowing AI Prompt bar.
4. **Video Editor**: Preview window with playback controls, timeline scrubber, track headers (Video, Audio, Text), frame rate display, speed adjustments, and color grading tools.
5. **AI Subsystem**: LangChain agents (`ImageEditingAgent`, `VideoEditingAgent`) and LangGraph `StateGraph` workflows integrated with Google Gemini AI (`gemini-2.5-flash`).
6. **Real-time WebSockets**: `/ws` gateway for live video rendering progress and status notifications.
