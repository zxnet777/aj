const BASE = '/api';
async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'request failed');
  return res.json();
}
export const api = {
  chat: (b) => req('/chat', { method: 'POST', body: JSON.stringify(b) }),
  quizNext: (b) => req('/quiz/next', { method: 'POST', body: JSON.stringify(b) }),
  quizAnswer: (b) => req('/quiz/answer', { method: 'POST', body: JSON.stringify(b) }),
  submitAnswer: (b) => req('/quiz/answer', { method: 'POST', body: JSON.stringify(b) }),
  removeMistake: (b) => req('/mistakes/remove', { method: 'POST', body: JSON.stringify(b) }),
  getProgress: () => req('/progress'),
  getMistakes: () => req('/mistakes'),
  reset: () => req('/reset', { method: 'POST' }),
  getFavorites: () => req('/favorites'),
  toggleFavorite: (payload) => req('/favorites', { method: 'POST', body: JSON.stringify(payload) }),
  getMeta: () => req('/meta'),
  getOutline: () => req('/knowledge/outline'),
  getTree: () => req('/knowledge/tree'),
  getMastery: () => req('/knowledge/mastery'),
  summarize: (b) => req('/knowledge/summarize', { method: 'POST', body: JSON.stringify(b) })
};
