import axios from "axios";

const API_BASE = "http://localhost:8000";

export const sendMessage = async (message, sessionId) => {
  const res = await axios.post(`${API_BASE}/chat`, {
    message,
    session_id: sessionId,
  });
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
