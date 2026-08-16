import { db } from './db.js';
import { analyzeWeakness } from './ai.js';

export function addMistake(userId, { subject, knowledgePoint, question, answer, options, explanation }) {
  // 同一用户 + 同一题目已存在时，更新记录而非重复插入，避免错题本里同一题反复出现
  const existing = db.prepare('SELECT id FROM mistakes WHERE user_id=? AND question=?').get(userId, question);
  const optStr = options ? JSON.stringify(options) : null;
  if (existing) {
    db.prepare('UPDATE mistakes SET subject=?, knowledge_point=?, answer=?, options=?, explanation=?, created_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(subject, knowledgePoint, answer, optStr, explanation || null, existing.id);
  } else {
    db.prepare('INSERT INTO mistakes (user_id,subject,knowledge_point,question,answer,options,explanation) VALUES (?,?,?,?,?,?,?)')
      .run(userId, subject, knowledgePoint, question, answer, optStr, explanation || null);
  }
}

export function getMistakes(userId) {
  return db.prepare('SELECT * FROM mistakes WHERE user_id=? ORDER BY created_at DESC').all(userId);
}

export async function getWeakness(userId) {
  const records = db.prepare('SELECT subject,knowledge_point AS knowledgePoint,correct,difficulty FROM quiz_records WHERE user_id=?').all(userId);
  return analyzeWeakness(records);
}
