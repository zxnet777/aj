import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]); // 从后端同步，不再纯本地
  const boxRef = useRef(null);

  // 拉取已保存的聊天记录（后端持久化，重置/换设备不丢）
  useEffect(() => {
    api.getChat().then((rows) => setHistory(rows.map((r) => ({ role: r.role, text: r.content })))).catch(() => {});
  }, []);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [history, busy]);

  // 刷题页把当前题甩过来，自动发起讲解（界面只显示友好提示，题目结构化数据作为隐藏上下文传给 AI）
  useEffect(() => {
    const q = window.__pendingChatQuestion;
    if (q) {
      window.__pendingChatQuestion = null;
      const userText = `帮我讲讲这道题（考点：${q.knowledgePoint}）📖`;
      const ctx = { subject: q.subject, question: q.question, knowledgePoint: q.knowledgePoint, options: q.options, answer: q.answer, explanation: q.explanation };
      send(userText, ctx);
    }
  }, []);

  const send = (forcedText, forcedCtx) => {
    const text = (forcedText != null ? forcedText : input).trim();
    if (!text || busy) return;
    // 普通提问时，把上一条甩题的隐藏上下文一并带上（若有）
    const ctx = forcedCtx || window.__lastQuizCtx || null;
    window.__lastQuizCtx = null;
    const userMsg = { role: 'user', text };
    setHistory((h) => [...h, userMsg]);
    api.addChat('user', text).catch(() => {});
    setInput(''); setBusy(true); setErr('');
    const payload = { subject: ctx?.subject || '', question: ctx?.question || text, knowledgePoint: ctx?.knowledgePoint || '', history: history.filter((m) => m.role === 'assistant' || m.role === 'user').map((m) => ({ role: m.role, content: m.text })) };
    api.chat(payload).then((reply) => {
      const r = typeof reply === 'string' ? reply : reply.reply || reply;
      const encouragement = (typeof reply === 'object' && reply.encouragement) ? `\n\n💪 ${reply.encouragement}` : '';
      const full = r + encouragement;
      setHistory((h) => [...h, { role: 'assistant', text: full }]);
      api.addChat('assistant', full).catch(() => {});
    }).catch((e) => setErr('阿杰学长没回上来：' + e.message)).finally(() => setBusy(false));
  };

  const clearHistory = () => {
    if (!window.confirm('清空聊天记录？')) return;
    api.clearChat().then(() => setHistory([])).catch(() => setHistory([]));
  };

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
