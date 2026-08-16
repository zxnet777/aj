import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function MistakeBook() {
  const [list, setList] = useState([]);
  const load = () => api.getMistakes().then(setList).catch(() => {});
  useEffect(() => {
    load();
    // 重置后重新拉取，确保错题本清空
    const onReset = () => load();
    window.addEventListener('data-reset', onReset);
    return () => window.removeEventListener('data-reset', onReset);
  }, []);
  const parse = (v) => { try { return JSON.parse(v); } catch { return null; } };
  return (
    <div>
      <h2>错题本</h2>
      {list.length === 0 && <p className="muted">还没有错题，继续刷题把它们消灭吧！</p>}
      {list.map((m) => {
        const options = parse(m.options);
        return (
          <div key={m.id} className="mistake">
            <b>{m.subject} · {m.knowledge_point}</b>
            <p className="mistake-q">{m.question}</p>
            {Array.isArray(options) && options.length > 0 && (
              <ul className="mistake-options">
                {options.map((o, i) => (
                  <li key={i} className={o.startsWith(m.answer) ? 'correct' : ''}>{o}</li>
                ))}
              </ul>
            )}
            <p>你的答案：<b>{m.answer}</b></p>
            {m.explanation && (
              <details className="mistake-explain">
                <summary>看解析</summary>
                <p>{m.explanation}</p>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
