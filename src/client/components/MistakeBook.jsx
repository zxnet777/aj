import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { startQuiz } from './QuizPanel.jsx';

export default function MistakeBook() {
  const [list, setList] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('全部');
  const [timeFilter, setTimeFilter] = useState('全部');
  const [subjects, setSubjects] = useState([]);
  const load = () => api.getMistakes().then((d) => {
    setList(d);
    setSubjects(['全部', ...Array.from(new Set(d.map((m) => m.subject)))]);
  }).catch(() => {});
  useEffect(() => {
    load();
    const onReset = () => load();
    window.addEventListener('data-reset', onReset);
    return () => window.removeEventListener('data-reset', onReset);
  }, []);

  const retryOne = (m) => startQuiz({ subject: m.subject, knowledgePoint: m.knowledge_point });

  const retryAll = () => {
    if (!list.length) return;
    startQuiz({ retryQueue: list.map((m) => ({
      subject: m.subject, knowledgePoint: m.knowledge_point, question: m.question, answer: m.answer,
    })) });
  };

  // 导出当前筛选错题为文本文件（可打印复习）
  const exportTxt = () => {
    if (!filtered.length) return;
    const lines = ['阿杰学长 · 错题本导出', '导出时间：' + new Date().toLocaleString(), ''];
    filtered.forEach((m, i) => {
      lines.push(`${i + 1}. [${m.subject} · ${m.knowledge_point}]`);
      lines.push('   题目：' + m.question);
      lines.push('   正确答案：' + m.answer);
      if (m.options) lines.push('   选项：' + m.options);
      if (m.explanation) lines.push('   解析：' + m.explanation);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '错题本_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 打印当前筛选错题
  const printMistakes = () => {
    if (!filtered.length) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = filtered.map((m, i) => `
      <div style="margin-bottom:14px;page-break-inside:avoid">
        <b>${i + 1}. [${m.subject} · ${m.knowledge_point}]</b><br/>
        题目：${m.question}<br/>
        正确答案：<b>${m.answer}</b><br/>
        ${m.explanation ? '解析：' + m.explanation + '<br/>' : ''}
      </div>`).join('');
    win.document.write(`<html><head><title>错题本</title></head><body style="font-family:sans-serif;padding:24px"><h2>阿杰学长 · 错题本</h2>${rows}<script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  const now = Date.now();
  const filtered = list.filter((m) => {
    if (subjectFilter !== '全部' && m.subject !== subjectFilter) return false;
    if (timeFilter === '一周内') return now - new Date(m.created_at).getTime() <= 7 * 864e5;
    if (timeFilter === '一月内') return now - new Date(m.created_at).getTime() <= 30 * 864e5;
    return true;
  });

  return (
    <div className="mistakes">
      <h2>错题本</h2>
      <div className="mb-filters">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          {['全部', '一周内', '一月内'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className="mb-retry-all" onClick={retryAll} disabled={!list.length}>🔁 错题重练（{list.length}）</button>
        <button className="mb-export" onClick={exportTxt} disabled={!filtered.length}>⬇ 导出</button>
        <button className="mb-print" onClick={printMistakes} disabled={!filtered.length}>🖨 打印</button>
      </div>

      {filtered.length === 0 && <p className="mb-empty">暂无错题，保持住 💪</p>}

      <ul className="mb-list">
        {filtered.map((m, i) => (
          <li key={m.id || i} className="mb-item" onClick={() => retryOne(m)} title="点击直接重刷这个考点">
            <div className="mb-meta">
              <span className="mb-subject">{m.subject}</span>
              <span className="mb-kp">{m.knowledge_point}</span>
              <span className="mb-time">{m.created_at ? m.created_at.slice(0, 10) : ''}</span>
            </div>
            <p className="mb-q">{m.question}</p>
            <p className="mb-ans">正确答案：<b>{m.answer}</b></p>
            <button className="mb-go" onClick={(e) => { e.stopPropagation(); retryOne(m); }}>→ 重刷</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
