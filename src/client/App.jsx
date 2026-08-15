import React, { useState } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import QuizPanel from './components/QuizPanel.jsx';
import MistakeBook from './components/MistakeBook.jsx';
import GameBar from './components/GameBar.jsx';

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('token') ? true : false);
  const [tab, setTab] = useState('home');
  if (!user) return <Login onOk={() => setUser(true)} />;
  return (
    <div className="app">
      <GameBar />
      <nav>
        {['home', 'chat', 'quiz', 'mistakes'].map((t) => (
          <button key={t} onClick={() => setTab(t)}>{t === 'home' ? '首页' : t === 'chat' ? '问学长' : t === 'quiz' ? '刷题' : '错题'}</button>
        ))}
      </nav>
      {tab === 'home' && <Dashboard />}
      {tab === 'chat' && <ChatPanel />}
      {tab === 'quiz' && <QuizPanel />}
      {tab === 'mistakes' && <MistakeBook />}
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
