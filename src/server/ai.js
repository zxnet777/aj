import OpenAI from 'openai';
import { QUIZBANK } from './quizbank.js';
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

export async function explainQuestion({ subject, question, history = [] }) {
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
    // 无本地题时回退演示题，并标注来源避免误导
    return { ...MOCK.quiz, subject, knowledgePoint, note: '该考点题库筹备中，先用通用演示题' };
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
  return callWithFallback(async () => {
    const msgs = [
      {
        role: 'system',
        content: SYSTEM + ' 根据做题记录返回 JSON:{"redLight":["薄弱考点"],"greenLight":["掌握考点"]}'
      },
      { role: 'user', content: '记录:' + JSON.stringify(records) }
    ];
    const r = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: msgs,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(r.choices[0].message.content);
  }, MOCK.weakness);
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
