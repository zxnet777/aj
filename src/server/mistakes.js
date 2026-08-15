import { db } from './db.js';
import { analyzeWeakness } from './ai.js';

export function addMistake(userId, { subject, knowledgePoint, question, answer }) {
  db.prepare('INSERT INTO mistakes (user_id,subject,knowledge_point,question,answer) VALUES (?,?,?,?,?)')
    .run(userId, subject, knowledgePoint, question, answer);
}

export function getMistakes(userId) {
  return db.prepare('SELECT * FROM mistakes WHERE user_id=? ORDER BY created_at DESC').all(userId);
}

export async function getWeakness(userId) {
  const records = db.prepare('SELECT subject,knowledge_point AS knowledgePoint,correct,difficulty FROM quiz_records WHERE user_id=?').all(userId);
  return analyzeWeakness(records);
}
