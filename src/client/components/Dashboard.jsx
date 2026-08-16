import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Companion from './Companion.jsx';
import { BADGES } from '../badges.js';

export default function Dashboard() {
  const [prog, setProg] = useState(null);
  const load = () => api.getProgress().then(setProg).catch(() => {});
  useEffect(() => {
    load();
    // 重置后刷新仪表盘，薄弱/已掌握等统计回到初始
    const onReset = () => load();
    window.addEventListener('data-reset', onReset);
    return () => window.removeEventListener('data-reset', onReset);
  }, []);
  const badges = prog?.badges || [];
  return (
    <div>
      <Companion text="欢迎回来～这里不是用来「逼你学」的，是帮你把知识点理清楚、变轻松的小助手。每天花几分钟，挑一个模糊的点理一理，慢慢就顺了。" />
      <h2>我的学习仪表盘</h2>
      {prog && (
        <ul>
          <li>积分 {prog.points}</li>
          <li>等级 {prog.level}</li>
          <li>薄弱考点：{(prog.weakness?.redLight || []).join('、') || '暂无'}</li>
          <li>已掌握：{(prog.weakness?.greenLight || []).join('、') || '暂无'}</li>
        </ul>
      )}

      <div className="km-badges">
        {BADGES.map((b) => {
          const got = badges.includes(b.key);
          return (
            <div key={b.key} className={'km-badge' + (got ? ' got' : '')} title={got ? b.name : (b.type === 'streak' ? `连续 ${b.at} 天解锁` : `点亮 ${b.at} 个解锁`)}>
              <span className="km-badge-emoji">{b.emoji}</span>
              <span className="km-badge-name">{b.name}</span>
            </div>
          );
        })}
      </div>

      <button onClick={() => window.dispatchEvent(new CustomEvent('goto-tab', { detail: 'knowledge' }))}>今天理 1 个知识点 →</button>
    </div>
  );
}
