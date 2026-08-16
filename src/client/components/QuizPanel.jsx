import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import Companion from './Companion.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizPanel() {
  // 初始考点：优先取知识页"去刷题"带过来的 pending，否则给个默认入口
  const pending = typeof window !== 'undefined' && window.__pendingQuiz;
  const [outline, setOutline] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [sub, setSub] = useState(pending?.subject || '数学');
  const [kp, setKp] = useState(pending?.knowledgePoint || '二次函数概念与图象');
  const [q, setQ] = useState(null);
  const [diff, setDiff] = useState(2);
  const [sel, setSel] = useState('');
  const [feedback, setFeedback] = useState(null); // {correct, text}
  const [submitting, setSubmitting] = useState(false);

  // 加载大纲，用于科目/知识点选择器
  useEffect(() => {
    api.getOutline().then((d) => {
      setOutline(d.outline);
      setSubjects(Object.keys(d.outline));
    }).catch(() => {});
  }, []);

  const points = outline ? Object.values(outline[sub] || {}).flat() : [];

  const next = async () => {
    setFeedback(null);
    setSel('');
    try {
      const r = await api.quizNext({ subject: sub, knowledgePoint: kp, difficulty: diff });
      setQ(r);
    } catch (e) {
      setFeedback({ correct: false, text: '加载题目失败：' + e.message });
    }
  };
  // 科目或知识点变化即拉题（sub/kp 已含跳转带来的最新值，无竞态）
  useEffect(() => { next(); }, [sub, kp]); // eslint-disable-line
  // 从知识页一键过来刷这个考点：自动切科目/知识点并开始
  useEffect(() => {
    const onGoto = (e) => {
      if (e.detail?.knowledgePoint) { setSub(e.detail.subject || sub); setKp(e.detail.knowledgePoint); }
    };
    window.addEventListener('goto-quiz', onGoto);
    if (window.__pendingQuiz) { setSub(window.__pendingQuiz.subject || sub); setKp(window.__pendingQuiz.knowledgePoint); window.__pendingQuiz = null; }
    return () => window.removeEventListener('goto-quiz', onGoto);
  }, []); // eslint-disable-line

  const answer = async () => {
    if (!q || submitting) return;
    setSubmitting(true);
    const correct = sel === q.answer;
    try {
      await api.quizAnswer({
        subject: sub, knowledgePoint: kp, correct, difficulty: diff,
        question: q.question, answer: q.answer,
        options: q.options, explanation: q.explanation
      });
      setFeedback({ correct, text: correct ? '答对啦！+10分 🎉' : q.explanation });
    } catch (e) {
      setFeedback({ correct: false, text: '提交失败：' + e.message });
    } finally {
      setSubmitting(false);
    }
    setDiff((d) => (correct ? Math.min(5, d + 1) : Math.max(1, d - 1)));
  };

  if (!q) return <p>加载中…</p>;
  // 该考点无本地题且无 AI：给出明确提示，不再回退到无关学科演示题
  if (q.noLocalQuestion) {
    return (
      <div>
        <h2>智能刷题</h2>
        <p className="quiz-kp">当前考点：<b>{kp}</b></p>
        <div className="quiz-feedback no">
          <p>📚 {q.note || '该考点暂未录入本地题库。'}</p>
          <p>建议：先点顶部「总结卡」复习该考点；或在电脑上配置 <code>DEEPSEEK_API_KEY</code> 后由 AI 即时出题。</p>
          <button onClick={() => { setKp(Object.values(outline?.[sub] || {})[0]?.[0] || ''); }}>换一个已录入的考点</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h2>智能刷题</h2>
      <div className="quiz-selectors">
        <label>科目
          <select value={sub} onChange={(e) => { setSub(e.target.value); setKp(Object.values(outline?.[e.target.value] || {})[0]?.[0] || ''); }}>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>知识点
          <select value={kp} onChange={(e) => setKp(e.target.value)}>
            {points.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <p className="quiz-kp">当前考点：<b>{kp}</b> · 难度 {diff} · 做对就把它变绿 🟢（对应知识地图里的红圈）</p>
      <div className="quiz-actions">
        <button className="quiz-summary" onClick={() => {
          window.__pendingSummary = { subject: sub, knowledgePoint: kp };
          window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'knowledge' }));
        }}>📖 看这个考点的总结卡</button>
      </div>
      <p>{q.question}{q.note && <span className="note">（{q.note}）</span>}</p>
      <div className="quiz-options">
        {(q.options || []).map((opt, i) => {
          const letter = LETTERS[i];
          const isCorrect = !feedback?.correct && letter === q.answer;
          const isChosen = letter === sel;
          const cls = 'quiz-option' + (isCorrect ? ' opt-correct' : isChosen ? ' sel' : '');
          return (
            <button key={i} onClick={() => setSel(letter)} disabled={!!feedback} className={cls}>
              {opt}
            </button>
          );
        })}
      </div>
      {!feedback ? (
        <button onClick={answer} disabled={!sel || submitting}>提交</button>
      ) : (
        <div className={feedback.correct ? 'quiz-feedback ok' : 'quiz-feedback no'}>
          <p>{feedback.text}</p>
          <button onClick={next}>下一题</button>
        </div>
      )}
      {feedback && !feedback.correct && (
        <Companion message={q.explanation || '再想想这个考点～'} />
      )}
    </div>
  );
}
