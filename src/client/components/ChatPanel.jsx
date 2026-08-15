import React, { useState } from 'react';
import { api } from '../api.js';
import Companion from './Companion.jsx';

export default function ChatPanel() {
  const [sub, setSub] = useState('数学');
  const [q, setQ] = useState('');
  const [r, setR] = useState(null);
  const ask = async () => {
    const res = await api.chat({ subject: sub, question: q, history: [] });
    setR(res);
  };
  return (
    <div>
      <h2>问阿杰学长</h2>
      <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="科目" />
      <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="把题目打出来，或描述你卡在哪" />
      <button onClick={ask}>请教</button>
      {r && (
        <div>
          <Companion text={r.encouragement} />
          <pre>{r.reply}</pre>
        </div>
      )}
    </div>
  );
}
