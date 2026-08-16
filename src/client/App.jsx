import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import QuizPanel from './components/QuizPanel.jsx';
import MistakeBook from './components/MistakeBook.jsx';
import KnowledgeMap from './components/KnowledgeMap.jsx';
import GameBar from './components/GameBar.jsx';

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('token') ? true : false);
  const [tab, setTab] = useState('home');
  const [mock, setMock] = useState(false);
  const [fatal, setFatal] = useState(null);
  useEffect(() => { api.getMeta().then((m) => setMock(m.mock)).catch(() => {}); }, []);
  useEffect(() => {
    const onGoto = (e) => setTab(e.detail);
    window.addEventListener('goto-tab', onGoto);
    const onErr = (e) => setFatal(e.message || '页面出错了');
    window.addEventListener('error', onErr);
    return () => { window.removeEventListener('goto-tab', onGoto); window.removeEventListener('error', onErr); };
  }, []);
  if (!user) return <Login onOk={() => setUser(true)} />;
  return (
    <div className="app">
      {mock && <div className="banner">演示模式：未配置 DeepSeek Key，AI 内容为示例数据，配置后即可真人讲解</div>}
      {fatal && <div className="banner err" onClick={() => setFatal(null)}>⚠️ {fatal}（点击关闭）</div>}
      <GameBar />
      <nav>
        {['home', 'chat', 'quiz', 'mistakes', 'knowledge'].map((t) => (
          <button key={t} onClick={() => setTab(t)}>{t === 'home' ? '首页' : t === 'chat' ? '问学长' : t === 'quiz' ? '刷题' : t === 'mistakes' ? '错题' : '知识'}</button>
        ))}
      </nav>
      {tab === 'home' && <Dashboard />}
      {tab === 'chat' && <ChatPanel />}
      {tab === 'quiz' && <QuizPanel />}
      {tab === 'mistakes' && <MistakeBook />}
      {tab === 'knowledge' && <KnowledgeMap />}
    </div>
  );
}

function Login({ onOk }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const go = async (register) => {
    try {
      const r = register ? await api.register(username, password) : await api.login(username, password);
      localStorage.setItem('token', r.token);
      onOk();
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="login">
      <h1>阿杰学长</h1>
      <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={() => go(false)}>登录</button>
      <button onClick={() => go(true)}>注册</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
