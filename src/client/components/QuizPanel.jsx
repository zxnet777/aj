import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import Companion from './Companion.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizPanel() {
  const [sub, setSub] = useState('数学');
  const [kp, setKp] = useState('二次函数');
  const [q, setQ] = useState(null);
  const [diff, setDiff] = useState(2);
  const [sel, setSel] = useState('');

  const next = async () => {
    const r = await api.quizNext({ subject: sub, knowledgePoint: kp, difficulty: diff });
    setQ(r);
    setSel('');
  };
  useEffect(() => { next(); }, []); // eslint-disable-line

  const answer = async () => {
    const correct = sel === q.answer;
    await api.quizAnswer({ subject: sub, knowledgePoint: kp, correct, difficulty: diff, question: q.question, answer: q.answer });
    setDiff((d) => (correct ? Math.min(5, d + 1) : Math.max(1, d - 1)));
    alert(correct ? '答对啦！+10分 🎉' : `还差一点：${q.explanation}`);
    next();
  };

  if (!q) return <p>加载中…</p>;
  return (
    <div>
      <h2>智能刷题</h2>
      <p>{q.question}</p>
      {(q.options || []).map((opt, i) => (
        <button key={i} onClick={() => setSel(LETTERS[i])} className={sel === LETTERS[i] ? 'sel' : ''}>
          {opt}
        </button>
      ))}
      <button onClick={answer} disabled={!sel}>提交</button>
    </div>
  );
}
