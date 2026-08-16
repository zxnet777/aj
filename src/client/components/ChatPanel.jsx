import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

const HISTORY_KEY = 'chat-history-阿杰学长';

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } });
  const boxRef = useRef(null);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50))); }, [history]);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [history, busy]);

  // 刷题页把当前题甩过来，自动发起讲解
  useEffect(() => {
    const q = window.__pendingChatQuestion;
    if (q) {
      window.__pendingChatQuestion = null;
      const text = `帮我讲讲这道${q.subject}题【${q.knowledgePoint}】\n题目：${q.question}\n选项：${(q.options || []).join(' / ')}\n我的答案：${q.answer}\n${q.explanation ? '参考解析：' + q.explanation : ''}`;
      setInput(text);
      send(text);
    }
  }, []);

  const send = (forced) => {
    const text = (forced != null ? forced : input).trim();
    if (!text || busy) return;
    const userMsg = { role: 'user', text };
    setHistory((h) => [...h, userMsg]);
    setInput(''); setBusy(true); setErr('');
    api.chat(text, history.map((m) => ({ role: m.role, content: m.text }))).then((reply) => {
      setHistory((h) => [...h, { role: 'assistant', text: reply }]);
    }).catch((e) => setErr('阿杰学长没回上来：' + e.message)).finally(() => setBusy(false));
  };

  const clearHistory = () => { if (window.confirm('清空聊天记录？')) setHistory([]); };

  return (
    <div className="chat">
      <h2>问学长</h2>
      <div className="chat-bar">
        <span>阿杰学长（湖州中考 · 学法教练）</span>
        {history.length > 0 && <button className="chat-clear" onClick={clearHistory}>清空记录</button>}
      </div>
      <div className="chat-box" ref={boxRef}>
        {history.length === 0 && !busy && <p className="chat-empty">有不会的题、想不通的考点，直接问阿杰学长～ 也可以在做题时点「问学长讲讲」把题目甩过来。</p>}
        {history.map((m, i) => (
          <div key={i} className={'chat-msg ' + m.role}>
            <div className="chat-role">{m.role === 'user' ? '我' : '阿杰'}</div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
        {busy && <div className="chat-msg assistant"><div className="chat-role">阿杰</div><div className="chat-text">思考中…</div></div>}
      </div>
      {err && <p className="chat-err">{err}</p>}
      <div className="chat-input">
        <textarea value={input} placeholder="问阿杰学长…（Ctrl+Enter 发送）" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) send(); }} />
        <button onClick={() => send()} disabled={busy || !input.trim()}>发送</button>
      </div>
    </div>
  );
}
