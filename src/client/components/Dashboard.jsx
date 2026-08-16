import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const BADGE_LABELS = {
  first_quiz: '初次刷题', first_mistake: '首错标记', first_summary: '首看总结',
  knowledge_explorer: '知识探索', seven_day_streak: '七日坚持', twenty_questions: '刷题二十',
  weakness_master: '攻克薄弱', full_master: '全科点亮',
};

function goKnowledge(kp) {
  if (kp) window.__pendingSummary = { knowledgePoint: kp };
  window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'knowledge' }));
}

export default function Dashboard() {
  const [prog, setProg] = useState(null);
  const load = () => api.getProgress().then(setProg).catch(() => {});
  useEffect(() => {
    load();
    const onReset = () => load();
    window.addEventListener('data-reset', onReset);
    return () => window.removeEventListener('data-reset', onReset);
  }, []);

  if (!prog) return <div className="dash"><h2>学习仪表盘</h2><p>加载中…</p></div>;
  const stats = prog.stats || {};

  return (
    <div className="dash">
      <h2>学习仪表盘</h2>

      <div className="dash-row">
        <div className="dash-card total"><div className="big">{prog.total || 0}</div><div>已掌握考点</div></div>
        <div className="dash-card total"><div className="big">{prog.totalCorrect || 0}</div><div>累计答对</div></div>
        <div className="dash-card total"><div className="big">{prog.points || 0}</div><div>积分 / Lv.{prog.level || 1}</div></div>
        <div className="dash-card streak">
          <div className="big">🔥 {prog.streak || 0}</div>
          <div>连续学习天数</div>
          <div className="streak-dots">
            {(prog.last7 || [false, false, false, false, false, false, false]).map((d, i) => (
              <span key={i} className={'dot ' + (d ? 'on' : 'off')} title={d ? '已打卡' : '未打卡'} />
            ))}
          </div>
          <div className="streak-hint">近 7 天打卡</div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="dash-col">
          <h3>薄弱考点（点一下去巩固）</h3>
          {stats.weakness && stats.weakness.length ? (
            <ul className="dash-list weak">
              {stats.weakness.map((x, i) => (
                <li key={i} className="dash-item" onClick={() => goKnowledge(x.knowledgePoint)} title="点我去知识地图看总结卡">
                  <span className="dot red" /> {x.knowledgePoint} <span className="rate">（{Math.round((x.correctRate || 0) * 100)}%）</span>
                </li>
              ))}
            </ul>
          ) : <p className="dash-none">暂无薄弱考点，保持住 💪</p>}
        </div>
        <div className="dash-col">
          <h3>已掌握（点一下复习）</h3>
          {stats.mastered && stats.mastered.length ? (
            <ul className="dash-list mastered">
              {stats.mastered.map((x, i) => (
                <li key={i} className="dash-item" onClick={() => goKnowledge(x.knowledgePoint)} title="点我去知识地图复习">
                  <span className="dot green" /> {x.knowledgePoint}
                </li>
              ))}
            </ul>
          ) : <p className="dash-none">还没点亮考点，去刷刷题吧 ✍️</p>}
        </div>
      </div>

      <div className="dash-badges">
        <h3>徽章</h3>
        {prog.badges && prog.badges.length ? (
          <div className="badge-row">
            {prog.badges.map((b, i) => <span key={i} className="badge">🏅 {BADGE_LABELS[b] || b}</span>)}
          </div>
        ) : <p className="dash-none">还没有徽章，多做对题解锁吧</p>}
      </div>
    </div>
  );
}
