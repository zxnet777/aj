import OpenAI from 'openai';
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
const SYSTEM = `你是"阿杰学长"，一个初三学生的 AI 学霸同桌。语气亲切像朋友，永远先鼓励再指正。
讲解题目用引导式：先问思路，再点破关键，最后总结方法。绝不直接把答案硬灌。
每次回复 JSON：{"reply":"讲解内容","encouragement":"一句鼓励"}。`;

export async function explainQuestion({ subject, question, history = [] }) {
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
}

export async function generateQuiz({ subject, knowledgePoint, difficulty = 2 }) {
  const msgs = [
    {
      role: 'system',
      content: SYSTEM + ' 出题请返回 JSON:{"question","options":["A..","B.."],"answer":"A","explanation","difficulty"}'
    },
    {
      role: 'user',
      content: `科目:${subject} 考点:${knowledgePoint} 难度:${difficulty}/5，出一道选择题`
    }
  ];
  const r = await getClient().chat.completions.create({
    model: 'deepseek-chat',
    messages: msgs,
    response_format: { type: 'json_object' }
  });
  return JSON.parse(r.choices[0].message.content);
}

export async function analyzeWeakness(records) {
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
}
