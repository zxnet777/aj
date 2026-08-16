import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import QuizPanel from './components/QuizPanel.jsx';
import MistakeBook from './components/MistakeBook.jsx';
import KnowledgeMap from './components/KnowledgeMap.jsx';
import GameBar from './components/GameBar.jsx';

export default function App() {
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
  // 重置：清空全部使用数据回到初始阶段，需二次确认防止误触
  const onReset = () => {
    if (!window.confirm('确定要重置吗？所有错题、刷题记录、掌握度、积分和徽章都会清空，回到刚开始的阶段。此操作不可撤销。')) return;
    api.reset().then(() => {
      // 通知各页重新拉取数据并刷新积分栏
      window.dispatchEvent(new CustomEvent('data-reset'));
      window.dispatchEvent(new CustomEvent('points-gain', { detail: { points: 0, level: 1, streak: 0 } }));
      setTab('home');
      alert('已重置，所有数据已回到初始阶段 🌱');
    }).catch((e) => alert('重置失败：' + e.message));
  };

  return (
    <div className="app">
      {mock && <div className="banner">演示模式：未配置 DeepSeek Key，AI 内容为示例数据，配置后即可真人讲解</div>}
      {fatal && <div className="banner err" onClick={() => setFatal(null)}>⚠️ {fatal}（点击关闭）</div>}
      <GameBar />
      <nav>
        {['home', 'chat', 'quiz', 'mistakes', 'knowledge'].map((t) => (
          <button key={t} onClick={() => setTab(t)}>{t === 'home' ? '首页' : t === 'chat' ? '问学长' : t === 'quiz' ? '刷题' : t === 'mistakes' ? '错题' : '知识'}</button>
        ))}
        <button className="nav-reset" onClick={onReset}>↺ 重置</button>
      </nav>
      {tab === 'home' && <Dashboard />}
      {tab === 'chat' && <ChatPanel />}
      {tab === 'quiz' && <QuizPanel />}
      {tab === 'mistakes' && <MistakeBook />}
      {tab === 'knowledge' && <KnowledgeMap />}
    </div>
  );
}
