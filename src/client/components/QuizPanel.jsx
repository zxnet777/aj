import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

function allKps(subject, outline) {
  const ch = outline[subject] || {};
  const arr = [];
  for (const c in ch) for (const kp of ch[c]) arr.push(kp);
  return arr;
}

// 触发刷题：可带单个考点或一组错题（用于"错题重练"）
export function startQuiz({ subject, knowledgePoint, retryQueue }) {
  if (retryQueue && retryQueue.length) {
    window.__retryQueue = retryQueue; // [{subject, knowledgePoint, question, answer, options, explanation}]
    window.__pendingQuiz = null;
    window.dispatchEvent(new CustomEvent('start-retry'));
  } else {
    window.__pendingQuiz = { subject, knowledgePoint };
    window.__retryQueue = null;
    window.dispatchEvent(new CustomEvent('goto-quiz', { detail: { subject, knowledgePoint } }));
  }
  window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'quiz' }));
}

export default function QuizPanel() {
  const [subject, setSubject] = useState('数学');
  const [kp, setKp] = useState('');
  const [q, setQ] = useState(null);
  const [sel, setSel] = useState(null);
  const [feedback, setFeedback] = useState(null); // {correct, gained, correctAnswer}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [retry, setRetry] = useState(null); // {queue, index} 错题重练状态
  const [favorited, setFavorited] = useState(false);
  const [msg, setMsg] = useState(''); // 轻提示（收藏等）
  const [outline, setOutline] = useState({}); // {科目:{章节:[考点]}}，与知识地图（湖州科目）完全一致
  const [candidates, setCandidates] = useState([]); // 输入时联想候选
  const [showCand, setShowCand] = useState(false);
  const started = useRef(false);
  const autoTried = useRef(false); // 防止重复自动出题

  // 科目列表直接取自大纲，保证刷题界面与知识地图（湖州中考科目）一一对应
  const subjects = Object.keys(outline);

  // 加载大纲，用于考点自动补全
  useEffect(() => { api.getTree().then((d) => setOutline(d.outline || {})).catch(() => {}); }, []);

  // 首次进入刷题页：直接出题（默认取大纲第一个科目的第一个考点），无需用户手动输入
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const firstSubject = Object.keys(outline)[0];
    if (!firstSubject) { setErr('题库为空，先去知识地图看看～'); return; }
    if (subject !== firstSubject) setSubject(firstSubject);
    const all = allKps(firstSubject, outline);
    const kpoint = all.length ? all[0] : '';
    if (kpoint) loadQuestion(firstSubject, kpoint);
    else setErr('题库为空，先去知识地图看看～');
  }, [outline]); // eslint-disable-line

  // 接收外部发起的刷题（知识地图/错题本/首页跳转）
  useEffect(() => {
    const onPending = (e) => {
      const d = e.detail || window.__pendingQuiz;
      if (d && d.knowledgePoint) {
        const subj = d.subject || Object.keys(outline)[0] || '数学';
        setSubject(subj);
        setKp(d.knowledgePoint);
        loadQuestion(subj, d.knowledgePoint);
      }
      window.__pendingQuiz = null;
    };
    const onRetry = () => {
      const queue = window.__retryQueue;
      if (queue && queue.length) {
        setRetry({ queue, index: 0 });
        loadRetry(0, queue);
      }
      window.__retryQueue = null;
    };
    window.addEventListener('goto-quiz', onPending);
    window.addEventListener('start-retry', onRetry);
    return () => { window.removeEventListener('goto-quiz', onPending); window.removeEventListener('start-retry', onRetry); };
  }, []);

  const loadQuestion = (subj, kpoint) => {
    setBusy(true); setErr(''); setSel(null); setFeedback(null); setFavorited(false);
    api.quizNext({ subject: subj, knowledgePoint: kpoint }).then((data) => {
      if (data && data.question) { setQ(data); started.current = true; }
      else { setQ(null); setErr('这个考点暂时没有题目，换个考点试试～'); }
    }).catch((e) => setErr('出题失败：' + e.message)).finally(() => setBusy(false));
  };

  const loadRetry = (index, queue) => {
    const item = queue[index];
    if (!item) { setQ(null); setRetry(null); setErr(''); setMsg('🎉 错题重练完成！'); return; }
    setSubject(item.subject); setKp(item.knowledgePoint);
    setBusy(true); setErr(''); setSel(null); setFeedback(null); setFavorited(false);
    api.quizNext({ subject: item.subject, knowledgePoint: item.knowledgePoint }).then((data) => {
      if (data && data.question) { setQ(data); started.current = true; }
      else {
        // 该考点抽不到题则跳过，直接进下一题
        const next = index + 1;
        setRetry({ queue, index: next });
        loadRetry(next, queue);
      }
    }).catch(() => { const next = index + 1; setRetry({ queue, index: next }); loadRetry(next, queue); }).finally(() => setBusy(false));
  };

  const submit = () => {
    if (sel == null || !q) return;
    setBusy(true);
    api.submitAnswer({
      subject, knowledgePoint: kp, correct: sel === q.answer, question: q.question, answer: q.answer, options: q.options,
    }).then((res) => {
      setFeedback({ correct: sel === q.answer, gained: res.points || 0, correctAnswer: q.answer });
      setBusy(false);
      // 错题重练模式：自动进入下一题（延迟 900ms 让学生看清对错）
      if (retry) {
        setTimeout(() => {
          const next = retry.index + 1;
          setRetry({ queue: retry.queue, index: next });
          loadRetry(next, retry.queue);
        }, 900);
      }
    }).catch((e) => { setErr('提交失败：' + e.message); setBusy(false); });
  };

  const next = () => {
    setSel(null); setFeedback(null); setFavorited(false);
    if (retry) {
      const next = retry.index + 1;
      setRetry({ queue: retry.queue, index: next });
      loadRetry(next, retry.queue);
    } else {
      loadQuestion(subject, kp);
    }
  };

  const onToggleFav = () => {
    if (!q) return;
    api.toggleFavorite({
      subject, knowledgePoint: kp, question: q.question, answer: q.answer, options: q.options, explanation: q.explanation,
    }).then((r) => { setFavorited(r.favorited); setMsg(r.favorited ? '⭐ 已收藏这道难题' : '已取消收藏'); setTimeout(() => setMsg(''), 1500); })
      .catch(() => setMsg('收藏失败'));
  };

  // 把当前题甩给阿杰学长讲解
  const askCoach = () => {
    if (!q) return;
    window.__pendingChatQuestion = { subject, knowledgePoint: kp, question: q.question, answer: q.answer, options: q.options, explanation: q.explanation };
    window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'chat' }));
  };

  return (
    <div className="quiz">
      <h2>刷题</h2>
      {retry && <p className="quiz-retry-tag">🔁 错题重练中：第 {retry.index + 1} / {retry.queue.length} 题</p>}
      <div className="quiz-controls">
        <select value={subject} onChange={(e) => {
          const s = e.target.value;
          setSubject(s);
          setKp(''); setCandidates([]); setShowCand(false); setRetry(null); window.__retryQueue = null;
          // 切换科目后直接进入该科目第一个考点出题，无需手动操作
          const all = allKps(s, outline);
          if (all.length) loadQuestion(s, all[0]);
          else { setQ(null); setErr('该科目题库为空，先去知识地图看看～'); }
        }}>
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="quiz-kp-wrap">
          <input
            placeholder="想指定考点？输入关键词，如 二次函数"
            value={kp}
            onChange={(e) => {
              const v = e.target.value;
              setKp(v);
              const all = allKps(subject, outline);
              const hits = v ? all.filter((k) => k.toLowerCase().includes(v.toLowerCase())) : [];
              setCandidates(hits.slice(0, 8));
              setShowCand(v.length > 0);
            }}
            onFocus={() => { if (kp.length) setShowCand(true); }}
            onBlur={() => setTimeout(() => setShowCand(false), 180)}
          />
          {showCand && candidates.length > 0 && (
            <ul className="quiz-candidates">
              {candidates.map((k) => (
                <li key={k} onMouseDown={() => { setKp(k); setShowCand(false); setRetry(null); window.__retryQueue = null; loadQuestion(subject, k); }}>
                  {k}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={() => { setRetry(null); window.__retryQueue = null; if (kp) loadQuestion(subject, kp); else { const all = allKps(subject, outline); if (all.length) loadQuestion(subject, all[0]); else setErr('该科目题库为空'); } }} disabled={busy}>换一题</button>
      </div>

      {!q && showCand && candidates.length === 0 && kp.length > 0 && (
        <p className="quiz-err">没有找到含「{kp}」的考点，换个关键词试试～</p>
      )}

      {busy && <p>阿杰学长正在出题…</p>}
      {err && <p className="quiz-err">{err}</p>}
      {msg && <p className="quiz-msg">{msg}</p>}

      {q && (
        <div className="quiz-card">
          <div className="quiz-meta">
            <span className="quiz-subject">{q.subject}</span>
            <span className="quiz-kp">{q.knowledgePoint}</span>
          </div>
          <p className="quiz-q">{q.question}</p>
          {q.options && q.options.length > 0 ? (
            <div className="quiz-options">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                let cls = 'quiz-option';
                if (feedback) {
                  if (letter === q.answer) cls += ' opt-correct';      // 正确答案：绿
                  if (letter === sel && sel !== q.answer) cls += ' opt-wrong'; // 你选错的：红
                } else if (letter === sel) cls += ' opt-selected';
                return (
                  <button key={i} className={cls} disabled={!!feedback} onClick={() => setSel(letter)}>
                    <span className="opt-letter">{letter}</span>
                    <span className="opt-text">{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="quiz-options">
              {['A', 'B', 'C', 'D'].map((letter) => {
                let cls = 'quiz-option';
                if (feedback) {
                  if (letter === q.answer) cls += ' opt-correct';
                  if (letter === sel && sel !== q.answer) cls += ' opt-wrong';
                } else if (letter === sel) cls += ' opt-selected';
                return (
                  <button key={letter} className={cls} disabled={!!feedback} onClick={() => setSel(letter)}>
                    <span className="opt-letter">{letter}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.note && <p className="quiz-note">💡 提示：{q.note}</p>}

          {!feedback ? (
            <div className="quiz-actions">
              <button className="quiz-submit" onClick={submit} disabled={sel == null}>提交</button>
              <button className="quiz-fav" onClick={onToggleFav}>{favorited ? '⭐ 已收藏' : '☆ 收藏难题'}</button>
              <button className="quiz-ask" onClick={askCoach}>问学长讲讲</button>
            </div>
          ) : (
            <div className="quiz-feedback">
              <p className={feedback.correct ? 'ok' : 'no'}>{feedback.correct ? `✅ 答对啦！+${feedback.gained} 积分` : `❌ 答错了，正确答案是 ${feedback.correctAnswer}`}</p>
              {!feedback.correct && q.explanation && <p className="quiz-explain">解析：{q.explanation}</p>}
              <div className="quiz-actions">
                <button className="quiz-next" onClick={next}>{retry ? '下一题 →' : '下一题'}</button>
                <button className="quiz-fav" onClick={onToggleFav}>{favorited ? '⭐ 已收藏' : '☆ 收藏难题'}</button>
                <button className="quiz-ask" onClick={askCoach}>问学长讲讲</button>
                <button className="quiz-summary" onClick={() => {
                  window.__pendingSummary = { subject, knowledgePoint: kp };
                  window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'knowledge' }));
                }}>看这个考点的总结卡</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!q && !busy && !err && !msg && (
        <p className="quiz-empty">进入刷题页已自动出题，直接用 👆 做错的题会自动进错题本，也可以从错题本一键「错题重练」。想换考点在上方输入关键词即可。</p>
      )}
    </div>
  );
}
