import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export const sendMessage = async (message, sessionId, language = null) => {
  const payload = {
    message,
    session_id: sessionId,
  };
  if (language) {
    payload.language = language;
  }
  const res = await axios.post(`${API_BASE}/chat`, payload);
  return res.data;
};

export const getHistory = async (sessionId) => {
  const res = await axios.get(`${API_BASE}/history/${sessionId}`);
  return res.data;
};

export const resetHistory = async (sessionId) => {
  await axios.delete(`${API_BASE}/history/${sessionId}`);
};

export const getSessions = async () => {
  const res = await axios.get(`${API_BASE}/sessions`);
  return res.data;
};

export const getSpeechAudioUrl = (text, lang = "si", gender = "female", speed = "") => {
  let url = `${API_BASE}/voice/speak?text=${encodeURIComponent(text)}&lang=${lang}&gender=${gender}`;
  if (speed) {
    url += `&speed=${encodeURIComponent(speed)}`;
  }
  return url;
};

export const getLiveVoiceWsUrl = (lang = "en-US", voice = "Aoede") => {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return `${wsBase}/ws/voice/live?lang=${encodeURIComponent(lang)}&voice=${encodeURIComponent(voice)}`;
};
