import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function MistakeBook() {
  const [list, setList] = useState([]);
  useEffect(() => { api.getMistakes().then(setList).catch(() => {}); }, []);
  return (
    <div>
      <h2>错题本</h2>
      {list.map((m) => (
        <div key={m.id} className="mistake">
          <b>{m.subject} · {m.knowledge_point}</b>
          <p>{m.question}</p>
          <p>答案：{m.answer}</p>
        </div>
      ))}
    </div>
  );
}
