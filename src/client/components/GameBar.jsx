import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function GameBar() {
  const [p, setP] = useState({ points: 0, level: 1, streak: 0 });
  const refresh = () => api.getProgress().then(setP).catch(() => {});
  useEffect(() => { refresh(); }, []);
  // 知识梳理 / 答题后刷新积分与连续天数，给孩子即时正反馈
  useEffect(() => {
    const onGain = (e) => {
      setP((prev) => ({ ...prev, points: e.detail.points, level: e.detail.level, streak: e.detail.streak }));
    };
    window.addEventListener('points-gain', onGain);
    return () => window.removeEventListener('points-gain', onGain);
  }, []);
  return (
    <div className="gamebar">
      ⭐{p.points} · Lv.{p.level} · 🔥连续{p.streak}天
    </div>
  );
}
