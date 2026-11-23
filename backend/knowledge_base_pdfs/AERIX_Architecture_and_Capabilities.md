# AERIX System Architecture & Capabilities Specification

## 1. System Identity
- **Product Name:** AERIX (Pronounced "Air-ix" / ඇයිරික්ස්)
- **Version:** 2.0.0
- **Creator & Lead Architect:** Ravindu Anjana
- **Category:** Autonomous Multilingual AI Co-Pilot & Voice Assistant
- **Primary Missions:** Technical co-pilot assistance, intelligent explanation of complex concepts, real-time multilingual voice conversation, and autonomous multi-source knowledge synthesis.

---

## 2. Voice Assistant & Real-Time Audio DSP Pipeline

### Dual-Language Seamless Switching:
- **Languages Supported:** Native Sri Lankan Sinhala (`si-LK`) and Conversational English (`en-US`).
- **Instant Language Switching:** Seamless top-bar toggle (`[ සිංහල | EN ]`) with persistent memory via `localStorage`.

### Audio DSP & Visualizer Engine:
- Uses browser **Web Audio API** (`AudioContext` and `AnalyserNode`) to capture live microphone input via `getUserMedia`.
- Computes real-time 64-point FFT frequency data with `smoothingTimeConstant: 0.65`.
- Drives a reactive 7-band audio equalizer and an animated **Liquid Moving Bubble Orb** that pulses dynamically with the user's real vocal volume.

### Neural Acoustic Speech Synthesis:
- Powered by **Microsoft Neural Voices** via high-speed streaming:
  - Sinhala Voice: `si-LK-ThiliniNeural` calibrated with `pitch="+3Hz"` and `rate="-5%"` for an enthusiastic, articulate Sri Lankan cadence.
  - English Voice: `en-US-AriaNeural` calibrated with `pitch="+2Hz"` and `rate="+1%"` for an energetic, explanatory conversational tone.
- **Phonetic Loanword Engine:** Maps English technical words and acronyms (e.g., Coding -> කෝඩින්, API -> ඒ.පී.අයි., Python -> පයිතන්, Bug -> බග්) to authentic Sinhala Unicode to ensure 100% native pronunciation without robotic artifacts.
- **Natural Breathing Pause Injection:** Automatically injects commas at conversational discourse markers and splits long run-on clauses (>8 words) so the voice takes natural human breaths every few words.

---

## 3. Retrieval-Augmented Generation (RAG) & Multi-Source Knowledge

### Multi-Source Knowledge Fusion:
AERIX does not rely on a single isolated data store; instead, every user turn synthesizes multiple verified sources:
1. **Local Vector Knowledge Base:** Vector embeddings computed with `sentence-transformers/all-MiniLM-L6-v2` and indexed in high-performance **FAISS (`IndexFlatIP`)** vector store. Contains documentation of AERIX's system architecture and creator Ravindu Anjana's developer profile.
2. **Live Internet Search:** Real-time web retrieval via DuckDuckGo (`ddgs`) providing up-to-the-minute facts, breaking news, and technical documentation.
3. **Wikipedia Knowledge Base:** Real-time encyclopedic entity lookup for scientific, historical, and general queries.
4. **Conversational Memory:** Maintains multi-turn context across sessions.

---

## 4. Fault-Tolerant & Resilient Architecture

### Database Resiliency Pattern:
- **Primary Database:** MongoDB Atlas cloud cluster (`aerix-ai.fusbdp4.mongodb.net`).
- **Automated Fallback:** If cloud database network or DNS is unreachable, the system automatically and transparently switches to an in-memory session cache with zero downtime.

### LLM Multi-Model Fallback Chain:
- Primary Engine: Groq Cloud ultra-fast inference (`qwen/qwen3.8-27b`).
- Fallback Models: Automatic failover to `openai/gpt-oss-120b` or `openai/gpt-oss-20b` if rate limits or network latency thresholds are triggered.

---

## 5. UI/UX Design System
- Custom **Obsidian & Crimson** Dark Theme (`#09090c` background with `#ff3344` brand accents).
- Minimalist glassmorphic modal cards, mobile-responsive layouts, and full Markdown code block rendering.

---

## 6. Generative 3D Canvas Studio & WebGL Engine
- **Feature Overview:** A real-time, interactive 3D WebGL Studio where users can input natural language prompts (via text or voice) and AERIX writes pure Three.js scene code that executes and renders dynamically inside an interactive canvas.
- **Key Technical Capabilities:**
  - **Dynamic Code Sandboxing:** Safely executes dynamically generated Three.js code using an isolated runtime runner with full runtime error containment.
  - **OrbitControls & WebGL Viewport:** Full camera manipulation (orbit, pan, zoom, reset), wireframe toggling, HD PNG screenshot exports, and play/pause controls.
  - **GPU Memory Management:** Automatically disposes geometries and materials between scenes, preventing memory leaks and managing the `requestAnimationFrame` lifecycle.
  - **Live Code Inspector:** A collapsible side drawer where recruiters and developers can view the generated Three.js code, modify parameters in real time, and re-run scenes on the fly.
  - **Voice-to-3D Integration:** Speech recognition allowing users to speak prompts in English or Sinhala to generate 3D objects.
