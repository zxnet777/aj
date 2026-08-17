import OpenAI from 'openai';
import { QUIZBANK } from './quizbank.js';
import { getLocalSummary } from './summaries.js';
let client;
function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    });
  }
  return client;
}
const HAS_KEY = !!process.env.DEEPSEEK_API_KEY;
export const usingMock = !HAS_KEY;

const SYSTEM = `你是"阿杰学长"，一个初三学生的 AI 学霸同桌。语气亲切像朋友，永远先鼓励再指正。
讲解题目用引导式：先问思路，再点破关键，最后总结方法。绝不直接把答案硬灌。
每次回复 JSON：{"reply":"讲解内容","encouragement":"一句鼓励"}。`;

// 无 API Key 或调用失败时的演示数据，保证未配置 Key 也能走通全流程
const MOCK = {
  explain: {
    reply: '同学你好！这道题我们先想想：题目要我们求什么？已知条件和目标之间差哪一步？\n\n比如这类题通常先找"等量关系"，再代入。你先试着列一下式子，卡住的地方告诉我，我陪你一步步推～',
    encouragement: '敢问就赢了一半，这题思路其实很顺，跟着我走一遍就通了！'
  },
  quiz: {
    question: '（演示题）二次函数 y = x² - 2x - 3 的顶点坐标是？',
    options: ['A. (1, -4)', 'B. (-1, -4)', 'C. (1, 4)', 'D. (-1, 4)'],
    answer: 'A',
    explanation: '配方：y=(x-1)²-4，顶点为 (1,-4)。选 A 正确！',
    difficulty: 2
  },
  weakness: { redLight: ['二次函数', '阅读理解'], greenLight: ['一元一次方程'] },
  summary: {
    concept: '这个知识点暂未预置详细卡片，先记住核心定义，再理解它和前后知识的联系。',
    easyMistakes: ['容易混淆相似概念', '忽略前提条件导致套错公式'],
    trick: '一句口诀帮你记牢：xxx',
    example: '典型例题 + 一步到位的解法思路。',
    examFocus: ['中考常以选择题/解答题考查', '常结合生活情境命题']
  }
};

async function callWithFallback(realCall, mock) {
  if (!HAS_KEY) return mock;
  try { return await realCall(); }
  catch (e) {
    console.warn('[ai] DeepSeek 调用失败，回退演示数据：', e.message);
    return mock;
  }
}

export async function explainQuestion({ subject, question, knowledgePoint, history = [] }) {
  // 演示模式：基于本地考点卡给出针对性讲解，而非千篇一律的话术
  if (!HAS_KEY) {
    const card = knowledgePoint ? getLocalSummary(subject, knowledgePoint) : null;
    const lines = [];
    if (card && card.desc) lines.push(card.desc);
    if (card && card.key) lines.push(`🔑 关键：${card.key}`);
    if (card && card.eg) lines.push(`✏️ 例子：${card.eg}`);
    if (card && card.mistake) lines.push(`⚠️ 易错：${card.mistake}`);
    if (card && card.method) lines.push(`🧭 方法：${card.method}`);
    if (card && card.analogy) lines.push(`💡 类比：${card.analogy}`);
    const reply = lines.length
      ? `同学你好！这道题的考点是「${knowledgePoint}」，学长给你划一下重点：\n\n${lines.join('\n')}\n\n你先对照选项排除明显错的，卡住的地方告诉我，我陪你一步步推～`
      : MOCK.explain.reply;
    return { reply, encouragement: MOCK.explain.encouragement };
  }
  return callWithFallback(async () => {
    const msgs = [
      { role: 'system', content: SYSTEM },
      ...history,
      { role: 'user', content: `科目:${subject}\n题目:${question}` }
    ];
    const r = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: msgs,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(r.choices[0].message.content);
  }, MOCK.explain);
}

export async function generateQuiz({ subject, knowledgePoint, difficulty = 2 }) {
  // mock 模式：优先用本地湖州/浙江中考风格题库（按知识点精准出对口题）
  if (usingMock) {
    const bank = (QUIZBANK[knowledgePoint] || []).filter((x) => x);
    if (bank.length) {
      // 难度自适应：优先在同难度档选题，无同难度则整体随机，保证刷题梯度有效
      const want = Number(difficulty) || 2;
      const same = bank.filter((q) => Number(q.difficulty) === want);
      const pool = same.length ? same : bank;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return { ...pick, subject, knowledgePoint };
    }
    // 无本地题且无 AI：明确告知，不再回退到无关学科的演示题
    return {
      subject,
      knowledgePoint,
      noLocalQuestion: true,
      note: '该考点暂未录入本地题库，可先复习总结卡；配置 DEEPSEEK_API_KEY 后可由 AI 即时出题。'
    };
  }
  return callWithFallback(async () => {
    const msgs = [
      {
        role: 'system',
        content: SYSTEM + ' 出题请返回 JSON:{"question","options":["A..","B.."],"answer":"A","explanation","difficulty"}，题目面向浙江湖州中考风格'
      },
      {
        role: 'user',
        content: `科目:${subject} 考点:${knowledgePoint} 难度:${difficulty}/5，出一道选择题（结合湖州/浙江中考考情）`
      }
    ];
    const r = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: msgs,
      response_format: { type: 'json_object' }
    });
    const q = JSON.parse(r.choices[0].message.content);
    return { ...q, subject, knowledgePoint };
  }, MOCK.quiz);
}

export async function analyzeWeakness(records) {
  // 本地直接计算，离线可用、随做题记录实时更新，不再返回固定演示数据
  return computeWeaknessFromRecords(records || []);
}

// 基于本地 quiz_records 实时计算薄弱/已掌握，避免首页永远显示固定假数据
function computeWeaknessFromRecords(records) {
  const stat = {}; // kp -> {total, correct}
  for (const r of records) {
    const kp = r.knowledgePoint || r.knowledge_point;
    if (!kp) continue;
    if (!stat[kp]) stat[kp] = { total: 0, correct: 0 };
    stat[kp].total += 1;
    if (r.correct) stat[kp].correct += 1;
  }
  const redLight = [], greenLight = [];
  for (const [kp, s] of Object.entries(stat)) {
    if (s.total < 2) continue; // 样本太少不评判
    const rate = s.correct / s.total;
    if (rate <= 0.5) redLight.push(kp);
    else if (rate >= 0.8) greenLight.push(kp);
  }
  return { redLight, greenLight };
}

export async function summarizeKnowledge({ subject, chapter, knowledgePoint }) {
  return callWithFallback(async () => {
    const msgs = [
      {
        role: 'system',
        content: SYSTEM + ' 请为初三学生总结一个知识点，返回 JSON:{"concept":"核心定义与理解","easyMistakes":["易错点1","易错点2"],"trick":"记忆口诀或技巧","example":"一道典型例题与解法","examFocus":["中考常见考法1","中考常见考法2"]}'
      },
      {
        role: 'user',
        content: `科目:${subject} 章节:${chapter} 知识点:${knowledgePoint}，帮我整理总结成体系化的卡片`
      }
    ];
    const r = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: msgs,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(r.choices[0].message.content);
  }, MOCK.summary);
}
