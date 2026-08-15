import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Companion from './Companion.jsx';

export default function Dashboard() {
  const [prog, setProg] = useState(null);
  useEffect(() => { api.getProgress().then(setProg).catch(() => {}); }, []);
  return (
    <div>
      <Companion />
      <h2>我的学习仪表盘</h2>
      {prog && (
        <ul>
          <li>积分 {prog.points}</li>
          <li>等级 {prog.level}</li>
          <li>薄弱考点：{(prog.weakness?.redLight || []).join('、') || '暂无'}</li>
          <li>已掌握：{(prog.weakness?.greenLight || []).join('、') || '暂无'}</li>
        </ul>
      )}
      <button onClick={() => alert('开始今日 1 个轻松小挑战！')}>今日小挑战</button>
    </div>
  );
}
