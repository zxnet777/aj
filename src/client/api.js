const BASE = '/api';
const token = () => localStorage.getItem('token');
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'request failed');
  return res.json();
}
export const api = {
  register: (u, p) => req('/register', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  login: (u, p) => req('/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  chat: (b) => req('/chat', { method: 'POST', body: JSON.stringify(b) }),
  quizNext: (b) => req('/quiz/next', { method: 'POST', body: JSON.stringify(b) }),
  quizAnswer: (b) => req('/quiz/answer', { method: 'POST', body: JSON.stringify(b) }),
  getProgress: () => req('/progress'),
  getMistakes: () => req('/mistakes'),
  getMeta: () => req('/meta'),
  getOutline: () => req('/knowledge/outline'),
  getTree: () => req('/knowledge/tree'),
  getMastery: () => req('/knowledge/mastery'),
  summarize: (b) => req('/knowledge/summarize', { method: 'POST', body: JSON.stringify(b) })
};
