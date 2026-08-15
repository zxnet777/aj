import React from 'react';

export default function Companion({ text }) {
  return (
    <div className="companion">
      <div className="avatar">阿杰</div>
      <div className="bubble">{text || '今天也加油呀，有不会的随时问我～'}</div>
    </div>
  );
}
