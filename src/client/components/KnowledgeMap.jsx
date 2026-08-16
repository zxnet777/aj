import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Companion from './Companion.jsx';

function findChapter(outline, kp) {
  if (!outline) return null;
  for (const subject in outline) for (const chapter in outline[subject]) {
    if (outline[subject][chapter].includes(kp)) return chapter;
  }
  return null;
}

// 掌握度 -> 红绿灯颜色
function light(m) {
  if (!m) return '⚪';
  if (m >= 60) return '🟢';
  if (m >= 30) return '🟡';
  return '🔴';
}

// 每日小目标（轮替，给孩子一个轻松可达成的切入点，降低打开压力）
const DAILY_TIPS = [
  '今天只挑 1 个你“有点模糊”的知识点，让阿杰学长帮你理一下，就很棒啦～',
  '先点开「数学」或「科学」，挑一个红/黄灯的知识点试试看？',
  '不急着全刷完，每天点亮 3 个知识点，一周就能串起一大片。',
  '卡住的地方才是进步的地方，点「帮我总结」让学长陪你过一遍。',
];

// 里程碑徽章（与后端 BADGE_MILESTONES 保持一致，用于展示；是否解锁以后端为准）
const BADGES = [
  { at: 10, key: 'sprout', name: '初露头角', emoji: '🌱' },
  { at: 50, key: 'half', name: '半壁江山', emoji: '🔥' },
  { at: 100, key: 'master', name: '知识大师', emoji: '🏆' },
  { at: 137, key: 'allstar', name: '全科点亮', emoji: '👑' },
];

export default function KnowledgeMap() {
  const [outline, setOutline] = useState(null);
  const [examFocus, setExamFocus] = useState({}); // 预置中考考法标签
  const [mastery, setMastery] = useState({}); // 统一掌握度（合并已梳理 + 刷题推导）
  const [open, setOpen] = useState({});        // 展开的科目/章节
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState(0);           // 已点亮知识点数（掌握度>0）
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);     // 积分奖励飘字
  const [badges, setBadges] = useState([]);     // 已解锁徽章 key 列表
  const [celebrate, setCelebrate] = useState(null); // 解锁徽章庆祝
  const [err, setErr] = useState(null);          // 全局错误提示
  const [tip] = useState(() => DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length]);

  useEffect(() => {
    loadTree();
    api.getProgress().then((p) => setBadges(p.badges || [])).catch(() => {});
    // 重置后重新加载树与进度，回到初始未点亮状态
    const onReset = () => { loadTree(); setBadges([]); setCard(null); };
    window.addEventListener('data-reset', onReset);
    return () => window.removeEventListener('data-reset', onReset);
  }, []);

  const loadTree = () => {
    // 合并接口：一次拿到大纲 + 中考考法 + 统一掌握度，减少串行请求
    api.getTree().then((d) => {
      setOutline(d.outline); setExamFocus(d.examFocus || {}); setMastery(d.mastery || {});
      // 从刷题页"看总结卡"过来：大纲就绪后自动展开并打开对应考点
      const pending = window.__pendingSummary;
      if (pending && pending.knowledgePoint) {
        const subject = pending.subject || Object.keys(d.outline)[0];
        const chapter = findChapter(d.outline, pending.knowledgePoint);
        if (subject && chapter) {
          setOpen((o) => ({ ...o, [subject]: true, [subject + '/' + chapter]: true }));
          summarize(subject, chapter, pending.knowledgePoint);
        }
        window.__pendingSummary = null;
      }
    }).catch((e) => setErr('加载知识地图失败：' + e.message));
  };

  // 计算进度
  useEffect(() => {
    if (!outline) return;
    let t = 0, l = 0;
    for (const subject in outline) for (const chapter in outline[subject]) for (const kp of outline[subject][chapter]) {
      t++;
      if (master(subject, kp) > 0) l++;
    }
    setTotal(t); setLit(l);
  }, [outline, mastery]);

  if (!outline) return <p>加载中…</p>;

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const master = (subject, kp) => mastery[subject + '||' + kp] ?? 0;

  const praise = (kp, gained, firstTime) => {
    const lines = [
      `「${kp}」理清楚啦！这一步走得很稳，给你 +${gained}⭐`,
      `不错哦，「${kp}」已经收进你的知识地图了～ +${gained}⭐`,
      `搞定「${kp}」！你离“全点亮”又近了一点 +${gained}⭐`,
      firstTime ? `第一次梳理就能串起来，厉害！「${kp}」+${gained}⭐` : `再巩固一遍「${kp}」，记得更牢啦 +${gained}⭐`,
    ];
    return lines[(kp.length + gained) % lines.length];
  };

  const summarize = async (subject, chapter, kp) => {
    setBusy(true);
    setCard(null);
    try {
      const r = await api.summarize({ subject, chapter, knowledgePoint: kp });
      setCard({ subject, chapter, kp, ...r });
      setMastery((s) => ({ ...s, [subject + '||' + kp]: r.mastery }));
      if (r.gained > 0) {
        window.dispatchEvent(new CustomEvent('points-gain', { detail: { points: r.points, level: r.level, streak: r.streak } }));
        setToast({ text: `+${(r.gained || 0)} ⭐`, kp });
        setTimeout(() => setToast(null), 1800);
      } else if (r.points != null) {
        setToast({ text: '🔁 复习一遍，记得更牢', kp });
        setTimeout(() => setToast(null), 1800);
      }
      if (r.unlockedBadges && r.unlockedBadges.length) {
        setBadges((b) => [...new Set([...b, ...r.unlockedBadges.map((x) => x.key)])]);
        const top = r.unlockedBadges[r.unlockedBadges.length - 1];
        setCelebrate(top);
        setTimeout(() => setCelebrate(null), 3200);
      }
    } catch (e) { setErr('总结失败：' + e.message); }
    finally { setBusy(false); }
  };

  const pct = total ? Math.round((lit / total) * 100) : 0;

  return (
    <div>
      <h2>知识地图</h2>
      {err && <div className="km-err" onClick={() => setErr(null)}>⚠️ {err}（点击关闭）</div>}

      {total > 0 && lit === 0 && (
        <div className="km-onboard">
          <Companion text="嗨，我是阿杰学长～这里把初三知识点画成了地图。别紧张，不用一次全看完，今天先点亮 1 个你觉得模糊的就好！" />
        </div>
      )}

      <div className="km-progress">
        <div className="km-progress-top">
          <span>🗺️ 已点亮 <b>{lit}</b> / {total} 个知识点</span>
          <span>{pct}%</span>
        </div>
        <div className="km-bar"><div className="km-bar-fill" style={{ width: pct + '%' }} /></div>
      </div>

      <div className="km-badges">
        {BADGES.map((b) => {
          const got = badges.includes(b.key);
          return (
            <div key={b.key} className={'km-badge' + (got ? ' got' : '')} title={got ? b.name : `点亮 ${b.at} 个解锁`}>
              <span className="km-badge-emoji">{b.emoji}</span>
              <span className="km-badge-name">{b.name}</span>
            </div>
          );
        })}
      </div>

      <p className="km-tip">💡 {tip}</p>

      <p className="hint">点科目展开章节，点知识点看掌握度；卡住就点「帮我总结」让阿杰学长帮你理清体系。🏷️ 标签=该知识点中考常见考法。每梳理一个知识点都能赚 ⭐，攒积分升级！</p>

      {toast && <div className="km-toast">🎉 {toast.text}</div>}
      {celebrate && (
        <div className="km-celebrate">
          <div className="km-celebrate-emoji">{celebrate.emoji}</div>
          <div className="km-celebrate-name">解锁徽章：{celebrate.name}！</div>
          <div className="km-celebrate-desc">{celebrate.desc}</div>
        </div>
      )}

      <div className="km-layout">
        <div className="km-tree">
          {Object.entries(outline).map(([subject, chapters]) => (
            <div key={subject} className="km-subject">
              <button className="km-head" onClick={() => toggle(subject)}>
                {open[subject] ? '▾' : '▸'} {subject}
              </button>
              {open[subject] && (
                <div className="km-chapters">
                  {Object.entries(chapters).map(([chapter, kps]) => (
                    <div key={chapter} className="km-chapter">
                      <button className="km-head" onClick={() => toggle(subject + '/' + chapter)}>
                        {open[subject + '/' + chapter] ? '▾' : '▸'} {chapter}
                      </button>
                      {open[subject + '/' + chapter] && (
                        <ul className="km-kps">
                          {kps.map((kp) => (
                            <li key={kp}>
                              <span className="km-light">{light(master(subject, kp))}</span>
                              <span>{kp}</span>
                              {(examFocus[kp] || []).map((t, i) => (
                                <span key={i} className="km-tag" title="中考常见考法">{t}</span>
                              ))}
                              <button className="km-sum" onClick={() => summarize(subject, chapter, kp)}>帮我总结</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="km-detail">
          {busy && <p>阿杰学长正在帮你整理…</p>}
          {card && (
            <div className="km-card">
              <Companion text={praise(card.kp, card.gained || 0, (card.gained || 0) >= 8)} />
              {card.source === 'local' && <p className="km-source">本地预置总结（湖州中考向）· 配置 DeepSeek Key 后可升级为个性化讲解</p>}
              <h3>{card.subject} · {card.kp} <span className="km-light">{light(card.mastery)} {card.mastery}%</span></h3>
              <p className="km-chapter-label">对应课本：{card.chapter}</p>
              <p className="km-review">已复习 {card.reviewCount || 1} 次{card.reviewCount > 1 ? '（红圈越复习越容易变黄/绿）' : ''}</p>
              <div className="km-actions">
                <button className="km-quiz" onClick={() => {
                  const detail = { subject: card.subject, knowledgePoint: card.kp };
                  window.__pendingQuiz = detail;
                  window.dispatchEvent(new CustomEvent('goto-quiz', { detail }));
                  window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'quiz' }));
                }}>
                  🔥 去刷这一题，做对就变绿 →
                </button>
              </div>
              <p><b>核心理解：</b>{card.concept}</p>
              <p><b>易错点：</b></p>
              <ul>{(card.easyMistakes || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              <p><b>记忆口诀：</b>{card.trick}</p>
              <p><b>典型例题：</b>{card.example}</p>
              <p><b>中考常见考法：</b></p>
              <ul>{(card.examFocus && card.examFocus.length ? card.examFocus : ['（暂无，点过"帮我总结"后由阿杰学长补充）']).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {!card && !busy && <p className="km-detail-tip">👈 在左侧点开一个知识点，点「帮我总结」就能在这里看到详细讲解卡片。</p>}
        </div>
      </div>
    </div>
  );
}
