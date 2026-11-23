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
import { getSpeechAudioUrl } from "../../../api/chatApi";
import "./VoiceAssistantModal.css";

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  onSendVoiceMessage,
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
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

  // Audio & Recognition Refs
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

  // Stop any active audio playback
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

  // Stop Web Audio API Visualizer
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

  // Start Real Microphone Web Audio Analyser
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

        // 7 sleek reactive frequency bars
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

  // Stop Speech Recognition
  const stopRecognition = useCallback(() => {
    isListeningRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        // Ignore abort errors
      }
    }
  }, []);

  // Send Query to AERIX Backend
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

  // Speak AI Response with Natural Fallback
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

    audio.play().catch(() => {
      if ("speechSynthesis" in window) {
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
        window.speechSynthesis.speak(utterance);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isMuted, stopAudio]);

  // Start Speech Recognition
  const startListening = useCallback((targetLang = null) => {
    if (isMuted) return;
    stopAudio();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
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

        if (interim) {
          setInterimText(interim);
        } else {
          setInterimText("");
        }

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
          } catch (e) {
            // Ignore restart errors
          }
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

  // Switch Language (Sinhala <-> English)
  const setVoiceLanguage = (newLang) => {
    if (newLang === languageRef.current && newLang === language) return;
    languageRef.current = newLang;
    setLanguage(newLang);
    try {
      localStorage.setItem("aerix_voice_language", newLang);
    } catch (e) {}

    stopAudio();
    stopRecognition();
    stopAudioVisualizer();
    setTranscript("");
    setInterimText("");
    setAiResponse("");
    currentSpokenTextRef.current = "";

    // Restart recognition immediately with the newly selected language
    setTimeout(() => {
      startListening(newLang);
    }, 100);
  };

  // Initialize on modal open / cleanup on close
  useEffect(() => {
    if (isOpen) {
      shouldContinueLoopRef.current = true;
      setStatus("listening");
      setTranscript("");
      setInterimText("");
      setAiResponse("");
      setErrorMessage("");
      setIsMuted(false);
      currentSpokenTextRef.current = "";

      const timer = setTimeout(() => {
        startListening(languageRef.current);
      }, 150);

      return () => clearTimeout(timer);
    } else {
      shouldContinueLoopRef.current = false;
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
          {/* Subtle Ambient Red Waves */}
          <div className={`pulse-ring ring-1 ${status}`}></div>
          <div className={`pulse-ring ring-2 ${status}`}></div>

          {/* LIQUID MOVING BUBBLE ORB */}
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

          {/* 7 Minimalist Audio Volume Wave Bars */}
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
              {language.startsWith("en") ? "Thinking..." : "සිතමින් පවතී..."}
            </div>
          ) : status === "speaking" ? (
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
              {language.startsWith("en") ? "Speak now, AERIX is listening..." : "කතා කරන්න, AERIX සවන් දෙයි..."}
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

            {/* Quick send icon if user wants to send immediately */}
            {status === "listening" && (transcript || currentSpokenTextRef.current) && (
              <button
                type="button"
                className="voice-quick-send-btn"
                onClick={() => submitQuery(currentSpokenTextRef.current || transcript, languageRef.current)}
                title="Send"
              >
                <Send size={14} />
              </button>
            )}

            {/* Quick interrupt pill if speaking */}
            {status === "speaking" && (
              <button
                type="button"
                className="voice-interrupt-btn"
                onClick={() => {
                  stopAudio();
                  startListening();
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
