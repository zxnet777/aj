import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function GameBar() {
  const [p, setP] = useState({ points: 0, level: 1, streak: 0 });
  useEffect(() => { api.getProgress().then(setP).catch(() => {}); }, []);
  return (
    <div className="gamebar">
      ⭐{p.points} · Lv.{p.level} · 🔥连续{p.streak}天
    </div>
  );
}
