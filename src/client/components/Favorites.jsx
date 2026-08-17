import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { startQuiz } from './QuizPanel.jsx';

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');

  const load = () => api.getFavorites().then(setItems).catch((e) => setErr('加载失败：' + e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const onReset = () => load();
    window.addEventListener('data-reset', onReset);
    return () => window.removeEventListener('data-reset', onReset);
  }, []);

  const go = (it) => startQuiz({ subject: it.subject, knowledgePoint: it.knowledge_point });

  return (
    <div className="favorites">
      <h2>⭐ 我的收藏</h2>
      {err && <p className="quiz-err">{err}</p>}
      {!items.length && !err && <p className="quiz-empty">还没有收藏的难题。刷题时点「☆ 收藏难题」即可把不会的题存到这里，随时回来重刷。</p>}
      <ul className="fav-list">
        {items.map((it) => (
          <li key={it.id} className="fav-item">
            <div className="fav-meta">
              <span className="quiz-subject">{it.subject}</span>
              <span className="quiz-kp">{it.knowledge_point}</span>
            </div>
            <p className="fav-q">{it.question}</p>
            {it.explanation && <p className="quiz-explain">解析：{it.explanation}</p>}
            <div className="fav-actions">
              <button className="quiz-next" onClick={() => go(it)}>去重刷 →</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
