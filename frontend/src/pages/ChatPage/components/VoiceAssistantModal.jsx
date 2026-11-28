import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { 
  X, 
  Mic, 
  MicOff, 
  Sparkles,
  RefreshCw,
  Send,
  VolumeX
} from "lucide-react";
import { getSpeechAudioUrl, getLiveVoiceWsUrl } from "../../../api/chatApi";
import "./VoiceAssistantModal.css";

const GEMINI_VOICES = ["Aoede", "Zephyr", "Puck", "Charon", "Kore", "Fenrir"];

function downsampleTo16kPCM(float32Buffer, inputSampleRate) {
  if (inputSampleRate === 16000) {
    const pcm = new Int16Array(float32Buffer.length);
    for (let i = 0; i < float32Buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Buffer[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(float32Buffer.length / ratio);
  const result = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const start = Math.round(i * ratio);
    const end = Math.min(Math.round((i + 1) * ratio), float32Buffer.length);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += float32Buffer[j];
      count++;
    }
    const avg = count > 0 ? sum / count : 0;
    const s = Math.max(-1, Math.min(1, avg));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return result;
}

function int16ToBase64(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToFloat32(base64Str) {
  const binary = atob(base64Str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  onSendVoiceMessage,
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [voiceEngine, setVoiceEngine] = useState(() => {
    return localStorage.getItem("aerix_voice_engine") || "live"; // 'live' | 'classic'
  });
  const [liveVoice, setLiveVoice] = useState(() => {
    return localStorage.getItem("aerix_gemini_voice") || "Aoede";
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("aerix_voice_language") || "si-LK";
  }); // 'si-LK' | 'en-US'
  const languageRef = useRef(localStorage.getItem("aerix_voice_language") || "si-LK");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 100
  const [frequencyBars, setFrequencyBars] = useState([4, 4, 4, 4, 4, 4, 4]);

  // Classic Audio & Recognition Refs
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const isListeningRef = useRef(false);
  const shouldContinueLoopRef = useRef(true);
  const silenceTimerRef = useRef(null);
  const currentSpokenTextRef = useRef("");

  // Web Audio API Visualizer Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Gemini Live WebSocket & PCM Audio Refs
  const liveWsRef = useRef(null);
  const liveMicCtxRef = useRef(null);
  const liveProcessorRef = useRef(null);
  const liveMicStreamRef = useRef(null);
  const livePlayCtxRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const isMutedRef = useRef(false);
  const liveAnalyserFrameRef = useRef(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Stop Gemini Live playback queue immediately (for barge-in or close)
  const stopLivePlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (_) {}
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  // Tear down Gemini Live WebSocket + Mic + Playback Contexts
  const stopLiveSession = useCallback(() => {
    stopLivePlayback();

    if (liveAnalyserFrameRef.current) {
      cancelAnimationFrame(liveAnalyserFrameRef.current);
      liveAnalyserFrameRef.current = null;
    }
    if (liveProcessorRef.current) {
      try {
        liveProcessorRef.current.disconnect();
      } catch (_) {}
      liveProcessorRef.current = null;
    }
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((t) => t.stop());
      liveMicStreamRef.current = null;
    }
    if (liveMicCtxRef.current && liveMicCtxRef.current.state !== "closed") {
      liveMicCtxRef.current.close().catch(() => {});
      liveMicCtxRef.current = null;
    }
    if (livePlayCtxRef.current && livePlayCtxRef.current.state !== "closed") {
      livePlayCtxRef.current.close().catch(() => {});
      livePlayCtxRef.current = null;
    }
    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch (_) {}
      liveWsRef.current = null;
    }
    setVolumeLevel(0);
    setFrequencyBars([4, 4, 4, 4, 4, 4, 4]);
  }, [stopLivePlayback]);

  // Schedule 24kHz PCM chunk playback for Gemini Live
  const enqueueLiveAudioChunk = useCallback((base64Pcm) => {
    try {
      if (!livePlayCtxRef.current || livePlayCtxRef.current.state === "closed") {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        livePlayCtxRef.current = new AudioCtx({ sampleRate: 24000 });
        nextPlayTimeRef.current = 0;
      }
      const ctx = livePlayCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const floatSamples = base64ToFloat32(base64Pcm);
      const audioBuffer = ctx.createBuffer(1, floatSamples.length, 24000);
      audioBuffer.copyToChannel(floatSamples, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
      source.start(startAt);
      nextPlayTimeRef.current = startAt + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setStatus("speaking");

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (
          activeSourcesRef.current.length === 0 &&
          livePlayCtxRef.current &&
          livePlayCtxRef.current.currentTime >= nextPlayTimeRef.current - 0.08
        ) {
          setStatus(isMutedRef.current ? "idle" : "listening");
        }
      };
    } catch (err) {
      console.warn("[Gemini Live Audio Playback Error]:", err);
    }
  }, []);

  // Start Gemini Live Bidirectional Session
  const startLiveSession = useCallback(async (targetLang = null, targetVoice = null) => {
    stopLiveSession();
    setErrorMessage("");
    setStatus("thinking");

    const activeLang = targetLang || languageRef.current || language;
    const activeVoice = targetVoice || liveVoice;
    const wsUrl = getLiveVoiceWsUrl(activeLang, activeVoice);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      liveMicStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const micCtx = new AudioCtx();
      liveMicCtxRef.current = micCtx;

      const source = micCtx.createMediaStreamSource(stream);
      const analyser = micCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      liveProcessorRef.current = processor;

      // Silent sink so ScriptProcessorNode fires without mic feedback
      const silentGain = micCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(micCtx.destination);

      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      ws.onopen = () => {
        setStatus(isMutedRef.current ? "idle" : "listening");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready") {
            setStatus(isMutedRef.current ? "idle" : "listening");
          } else if (msg.type === "audio" && msg.data) {
            enqueueLiveAudioChunk(msg.data);
          } else if (msg.type === "input_transcript" && msg.text) {
            setTranscript((prev) => (prev ? `${prev} ${msg.text}` : msg.text));
          } else if (msg.type === "output_transcript" && msg.text) {
            setAiResponse((prev) => (prev ? `${prev}${msg.text}` : msg.text));
          } else if (msg.type === "interrupted") {
            stopLivePlayback();
            setAiResponse("");
            setStatus("listening");
          } else if (msg.type === "turn_complete") {
            setTranscript("");
          } else if (msg.type === "error") {
            setErrorMessage(msg.message || "Gemini Live connection error.");
            setStatus("error");
          }
        } catch (err) {
          console.warn("[Gemini Live WS Parse]:", err);
        }
      };

      ws.onerror = () => {
        setErrorMessage("Could not connect to Gemini Live. Switching or retry available.");
        setStatus("error");
      };

      ws.onclose = () => {
        if (liveWsRef.current === ws) {
          liveWsRef.current = null;
        }
      };

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = downsampleTo16kPCM(inputData, micCtx.sampleRate);
        const b64 = int16ToBase64(pcm16);
        ws.send(JSON.stringify({ type: "audio", data: b64 }));
      };

      // Mic visualizer loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateBars = () => {
        if (!liveMicCtxRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        setVolumeLevel(Math.min(100, Math.round((avg / 120) * 100)));
        setFrequencyBars([
          Math.max(6, Math.min(100, Math.round((dataArray[2] || 0) / 2.2))),
          Math.max(8, Math.min(100, Math.round((dataArray[5] || 0) / 2.0))),
          Math.max(12, Math.min(100, Math.round((dataArray[9] || 0) / 1.8))),
          Math.max(15, Math.min(100, Math.round((dataArray[13] || 0) / 1.7))),
          Math.max(12, Math.min(100, Math.round((dataArray[17] || 0) / 1.8))),
          Math.max(8, Math.min(100, Math.round((dataArray[21] || 0) / 2.0))),
          Math.max(6, Math.min(100, Math.round((dataArray[25] || 0) / 2.2))),
        ]);
        liveAnalyserFrameRef.current = requestAnimationFrame(updateBars);
      };
      updateBars();
    } catch (err) {
      console.error("[Gemini Live Init Error]:", err);
      setErrorMessage("Microphone permission denied or unavailable.");
      setStatus("error");
    }
  }, [language, liveVoice, stopLiveSession, stopLivePlayback, enqueueLiveAudioChunk]);

  // Stop any active classic audio playback
  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Stop Web Audio API Visualizer (Classic)
  const stopAudioVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVolumeLevel(0);
    setFrequencyBars([4, 4, 4, 4, 4, 4, 4]);
  }, []);

  // Start Real Microphone Web Audio Analyser (Classic)
  const startAudioVisualizer = useCallback(async () => {
    stopAudioVisualizer();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalizedVol = Math.min(100, Math.round((avg / 120) * 100));
        setVolumeLevel(normalizedVol);

        const bars = [
          Math.max(6, Math.min(100, Math.round((dataArray[2] || 0) / 2.2))),
          Math.max(8, Math.min(100, Math.round((dataArray[5] || 0) / 2.0))),
          Math.max(12, Math.min(100, Math.round((dataArray[9] || 0) / 1.8))),
          Math.max(15, Math.min(100, Math.round((dataArray[13] || 0) / 1.7))),
          Math.max(12, Math.min(100, Math.round((dataArray[17] || 0) / 1.8))),
          Math.max(8, Math.min(100, Math.round((dataArray[21] || 0) / 2.0))),
          Math.max(6, Math.min(100, Math.round((dataArray[25] || 0) / 2.2))),
        ];
        setFrequencyBars(bars);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn("[Voice Assistant] Mic visualizer initialization note:", err);
    }
  }, [stopAudioVisualizer]);

  // Stop Classic Speech Recognition
  const stopRecognition = useCallback(() => {
    isListeningRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {}
    }
  }, []);

  // Classic: Send Query to AERIX Backend
  const submitQuery = useCallback(async (userText, overrideLang = null) => {
    const textToSubmit = (userText || currentSpokenTextRef.current || "").trim();
    if (!textToSubmit) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    currentSpokenTextRef.current = "";
    stopRecognition();
    stopAudioVisualizer();
    setStatus("thinking");

    const currentLang = overrideLang || languageRef.current || language;
    const langCode = currentLang.toLowerCase().startsWith("en") ? "en" : "si";

    try {
      const response = await onSendVoiceMessage(textToSubmit, null, langCode);
      const reply = response?.reply || (langCode === "en" ? "I am listening." : "මම සවන් දෙමි.");
      setAiResponse(reply);
      speakResponse(reply, langCode);
    } catch (err) {
      console.error("[Voice Assistant] Query failed:", err);
      const failMsg = langCode === "en" 
        ? "Sorry, I could not process your query." 
        : "සමාවන්න, මට පිළිතුරක් ලබා ගැනීමට නොහැකි විය.";
      setAiResponse(failMsg);
      speakResponse(failMsg, langCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, onSendVoiceMessage, stopAudioVisualizer, stopRecognition]);

  // Classic: Speak AI Response (ElevenLabs / Edge-TTS)
  const speakResponse = useCallback((text, explicitLang = null) => {
    stopAudio();
    setStatus("speaking");

    const currentLang = explicitLang || languageRef.current || language;
    const langCode = currentLang.toLowerCase().startsWith("en") ? "en" : "si";
    const audioUrl = getSpeechAudioUrl(text, langCode);

    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    audio.onplay = () => {
      setStatus("speaking");
    };

    audio.onended = () => {
      stopAudio();
      if (shouldContinueLoopRef.current && !isMuted) {
        setStatus("listening");
        setTranscript("");
        setInterimText("");
        currentSpokenTextRef.current = "";
        setTimeout(() => {
          if (shouldContinueLoopRef.current && !isMuted) {
            startListening(languageRef.current);
          }
        }, 300);
      } else {
        setStatus("idle");
      }
    };

    audio.onerror = () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode === "en" ? "en-US" : "si-LK";
        utterance.onend = () => {
          if (shouldContinueLoopRef.current && !isMuted) {
            setStatus("listening");
            startListening(languageRef.current);
          } else {
            setStatus("idle");
          }
        };
        utterance.onerror = () => setStatus("idle");
        window.speechSynthesis.speak(utterance);
      } else {
        setStatus("idle");
      }
    };

    audio.play().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isMuted, stopAudio]);

  // Classic: Start Speech Recognition
  const startListening = useCallback((targetLang = null) => {
    if (isMuted) return;
    stopAudio();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser. Switch to Live mode or use Chrome/Edge.");
      setStatus("error");
      return;
    }

    const activeLang = targetLang || languageRef.current || language || "en-US";
    languageRef.current = activeLang;

    try {
      stopRecognition();

      const recognition = new SpeechRecognition();
      recognition.lang = activeLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setStatus("listening");
        setErrorMessage("");
        setInterimText("");
        startAudioVisualizer();
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const latestText = final || interim;
        if (latestText) {
          currentSpokenTextRef.current = latestText;
          setTranscript(latestText);
        }

        setInterimText(interim || "");

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          if (currentSpokenTextRef.current.trim()) {
            submitQuery(currentSpokenTextRef.current, languageRef.current);
          }
        }, 1300);
      };

      recognition.onerror = (event) => {
        console.warn("[Voice Assistant] Recognition notice:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone access denied. Please allow microphone permissions in your browser.");
          setStatus("error");
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        if (currentSpokenTextRef.current.trim() && status === "listening") {
          submitQuery(currentSpokenTextRef.current, languageRef.current);
          return;
        }

        if (isListeningRef.current && shouldContinueLoopRef.current && !isMuted && status === "listening") {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[Voice Assistant] Start recognition error:", err);
      setStatus("error");
      setErrorMessage("Could not activate microphone.");
    }
  }, [language, isMuted, status, stopAudio, stopRecognition, startAudioVisualizer, submitQuery]);

  // Toggle Mute / Mic
  const handleToggleMute = () => {
    if (voiceEngine === "live") {
      if (isMuted) {
        setIsMuted(false);
        setStatus("listening");
      } else {
        setIsMuted(true);
        stopLivePlayback();
        setStatus("idle");
      }
      return;
    }

    if (isMuted) {
      setIsMuted(false);
      startListening(languageRef.current);
    } else {
      setIsMuted(true);
      stopRecognition();
      stopAudioVisualizer();
      stopAudio();
      setStatus("idle");
    }
  };

  // Switch Engine (Gemini Live <-> Classic ElevenLabs/Edge-TTS)
  const switchVoiceEngine = (newEngine) => {
    if (newEngine === voiceEngine) return;
    setVoiceEngine(newEngine);
    try {
      localStorage.setItem("aerix_voice_engine", newEngine);
    } catch (_) {}

    stopLiveSession();
    stopRecognition();
    stopAudioVisualizer();
    stopAudio();
    setTranscript("");
    setInterimText("");
    setAiResponse("");
    setErrorMessage("");
    setIsMuted(false);

    setTimeout(() => {
      if (newEngine === "live") {
        startLiveSession(languageRef.current, liveVoice);
      } else {
        startListening(languageRef.current);
      }
    }, 100);
  };

  // Switch Gemini Live Voice Persona
  const handleLiveVoiceChange = (e) => {
    const newVoice = e.target.value;
    setLiveVoice(newVoice);
    try {
      localStorage.setItem("aerix_gemini_voice", newVoice);
    } catch (_) {}

    if (voiceEngine === "live" && isOpen) {
      setAiResponse("");
      setTranscript("");
      startLiveSession(languageRef.current, newVoice);
    }
  };

  // Switch Language (Sinhala <-> English)
  const setVoiceLanguage = (newLang) => {
    if (newLang === languageRef.current && newLang === language) return;
    languageRef.current = newLang;
    setLanguage(newLang);
    try {
      localStorage.setItem("aerix_voice_language", newLang);
    } catch (e) {}

    stopLiveSession();
    stopAudio();
    stopRecognition();
    stopAudioVisualizer();
    setTranscript("");
    setInterimText("");
    setAiResponse("");
    currentSpokenTextRef.current = "";

    setTimeout(() => {
      if (voiceEngine === "live") {
        startLiveSession(newLang, liveVoice);
      } else {
        startListening(newLang);
      }
    }, 100);
  };

  // Initialize on modal open / cleanup on close
  useEffect(() => {
    if (isOpen) {
      shouldContinueLoopRef.current = true;
      setTranscript("");
      setInterimText("");
      setAiResponse("");
      setErrorMessage("");
      setIsMuted(false);
      currentSpokenTextRef.current = "";

      const timer = setTimeout(() => {
        if (voiceEngine === "live") {
          startLiveSession(languageRef.current, liveVoice);
        } else {
          setStatus("listening");
          startListening(languageRef.current);
        }
      }, 150);

      return () => clearTimeout(timer);
    } else {
      shouldContinueLoopRef.current = false;
      stopLiveSession();
      stopRecognition();
      stopAudioVisualizer();
      stopAudio();
      setStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Manual Close
  const handleClose = () => {
    shouldContinueLoopRef.current = false;
    stopLiveSession();
    stopRecognition();
    stopAudioVisualizer();
    stopAudio();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="voice-modal-backdrop" onClick={handleClose}>
      <div 
        className="voice-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Top Bar */}
        <div className="voice-modal-header">
          <div className="voice-brand">
            <span className="voice-brand-logo">AERIX</span>
            <span className={`voice-status-dot ${status}`}></span>
          </div>

          <div className="voice-header-actions">
            {/* Engine Switcher [ Live | Classic ] */}
            <div className="lang-segment-control" title="Voice Engine">
              <button
                type="button"
                className={`lang-pill ${voiceEngine === "live" ? "active" : ""}`}
                onClick={() => switchVoiceEngine("live")}
                title="Gemini Live Real-Time Audio"
              >
                Live
              </button>
              <button
                type="button"
                className={`lang-pill ${voiceEngine === "classic" ? "active" : ""}`}
                onClick={() => switchVoiceEngine("classic")}
                title="Classic (ElevenLabs / Edge-TTS)"
              >
                Classic
              </button>
            </div>

            {/* Gemini Voice Selector (when in Live mode) */}
            {voiceEngine === "live" && (
              <select
                className="voice-persona-select"
                value={liveVoice}
                onChange={handleLiveVoiceChange}
                title="Select Gemini Voice"
              >
                {GEMINI_VOICES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}

            {/* Minimalist Segmented Language Switcher (Sinhala | English) */}
            <div className="lang-segment-control">
              <button
                type="button"
                className={`lang-pill ${language === "si-LK" ? "active" : ""}`}
                onClick={() => setVoiceLanguage("si-LK")}
                title="Sinhala Mode"
              >
                සිංහල
              </button>
              <button
                type="button"
                className={`lang-pill ${language === "en-US" ? "active" : ""}`}
                onClick={() => setVoiceLanguage("en-US")}
                title="English Conversational Mode"
              >
                EN
              </button>
            </div>

            <button
              type="button"
              className="voice-close-btn"
              onClick={handleClose}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Center Stage: Minimalist Liquid Bubble Orb */}
        <div className="voice-center-stage">
          <div className={`pulse-ring ring-1 ${status}`}></div>
          <div className={`pulse-ring ring-2 ${status}`}></div>

          <div 
            className={`liquid-bubble-orb ${status}`}
            style={{
              transform: status === "listening" && volumeLevel > 15
                ? `scale(${1 + (volumeLevel / 400)})`
                : undefined,
              boxShadow: status === "listening" && volumeLevel > 15
                ? `0 0 ${35 + (volumeLevel * 0.7)}px rgba(255, 51, 68, ${0.4 + (volumeLevel / 200)})`
                : undefined
            }}
            onClick={() => {
              if (voiceEngine === "live") {
                if (status === "speaking") {
                  stopLivePlayback();
                  setStatus("listening");
                } else if (status === "error") {
                  startLiveSession(languageRef.current, liveVoice);
                }
                return;
              }
              if (status === "speaking") {
                stopAudio();
                startListening();
              } else if (status === "idle" || status === "error") {
                startListening();
              }
            }}
            title={status === "speaking" ? "Tap to interrupt & speak" : "AERIX Voice Core"}
          >
            <div className="liquid-core-fluid"></div>
            <div className="liquid-swirl-layer"></div>
            <div className="liquid-highlight"></div>

            <div className="bubble-center-glyph">
              {status === "thinking" ? (
                <RefreshCw size={22} className="thinking-spin-icon" />
              ) : (
                <Sparkles size={22} className="sparkle-glyph-icon" />
              )}
            </div>
          </div>

          <div className={`mic-equalizer-bars ${status}`}>
            {frequencyBars.map((heightPercent, index) => (
              <span 
                key={index} 
                className={`eq-bar bar-${index}`}
                style={{
                  height: status === "listening" 
                    ? `${heightPercent}%` 
                    : status === "speaking" 
                      ? `${20 + Math.sin(index + Date.now() / 150) * 35}%` 
                      : "6%"
                }}
              />
            ))}
          </div>
        </div>

        {/* Minimalist Live Transcript Display */}
        <div className="voice-transcript-container">
          {errorMessage ? (
            <div className="voice-error-text">{errorMessage}</div>
          ) : status === "thinking" ? (
            <div className="voice-thinking-text">
              <span className="red-dot-pulse"></span>
              {voiceEngine === "live"
                ? "Connecting Gemini Live..."
                : language.startsWith("en")
                  ? "Thinking..."
                  : "සිතමින් පවතී..."}
            </div>
          ) : status === "speaking" && aiResponse ? (
            <div className="voice-response-text">
              <div className="voice-markdown-content">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            </div>
          ) : transcript || interimText ? (
            <div className="voice-user-text">
              <p>
                {transcript || interimText}
                {interimText && !transcript && <span className="interim-text">...</span>}
              </p>
            </div>
          ) : (
            <div className="voice-hint-text">
              {voiceEngine === "live"
                ? language.startsWith("en")
                  ? `Gemini Live (${liveVoice}) active — speak naturally...`
                  : `Gemini Live (${liveVoice}) සූදානම් — කතා කරන්න...`
                : language.startsWith("en")
                  ? "Speak now, AERIX is listening..."
                  : "කතා කරන්න, AERIX සවන් දෙයි..."}
            </div>
          )}
        </div>

        {/* Minimalist Controls Footer */}
        <div className="voice-modal-footer">
          <div className="voice-controls-row">
            <button
              type="button"
              className={`voice-action-circle-btn ${isMuted ? "muted" : "active-mic"}`}
              onClick={handleToggleMute}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {voiceEngine === "classic" && status === "listening" && (transcript || currentSpokenTextRef.current) && (
              <button
                type="button"
                className="voice-quick-send-btn"
                onClick={() => submitQuery(currentSpokenTextRef.current || transcript, languageRef.current)}
                title="Send"
              >
                <Send size={14} />
              </button>
            )}

            {status === "speaking" && (
              <button
                type="button"
                className="voice-interrupt-btn"
                onClick={() => {
                  if (voiceEngine === "live") {
                    stopLivePlayback();
                    setStatus("listening");
                  } else {
                    stopAudio();
                    startListening();
                  }
                }}
                title="Interrupt"
              >
                <VolumeX size={14} />
                <span>Interrupt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
