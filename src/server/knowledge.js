import { db } from './db.js';
import { summarizeKnowledge, usingMock } from './ai.js';
import { getLocalSummary } from './summaries.js';
import { addPoints, checkIn, checkMilestoneBadges, getBadges } from './gamify.js';

// 内置知识大纲骨架（C 方案：骨架内置，AI 可动态细化扩展）
// 严格对齐用户学校教材（浙江初三）：
//   语文/道德与法治 = 部编人教版 九上+九下；英语 = Go for it! 九年级全一册
//   数学/科学 = 浙教版（浙江教育出版社）九上+九下；历史与社会 = 人教版 九上+九下
// 浙教版章节结构按真实课标组织；知识点以"九上/九下"分章，便于"帮我总结"携带 chapter。
export const OUTLINE = {
  语文: {
    '九上·现代文与诗歌': ['沁园春·雪', '乡愁/议论文阅读', '敬业与乐业', '就英法联军远征中国致巴特勒上尉的信', '小说人物形象分析', '论证思路与结构'],
    '九上·古诗文': ['岳阳楼记', '醉翁亭记', '湖心亭看雪', '诗词三首（行路难/酬乐天/水调歌头）', '文言文实词虚词'],
    '九上·写作': ['观点要明确', '议论要言之有据', '学习缩写/改写'],
    '九下·现代文': ['祖国啊我亲爱的祖国', '孔乙己', '变色龙', '蒲柳人家', '小说鉴赏'],
    '九下·古诗文': ['鱼我所欲也', '送东阳马生序', '曹刿论战', '邹忌讽齐王纳谏', '诗词曲五首'],
    '九下·写作': ['审题立意', '布局谋篇', '创意表达']
  },
  数学: {
    '九上·二次函数': ['二次函数概念与图象', '二次函数解析式', '二次函数与一元二次方程', '二次函数的应用'],
    '九上·简单事件的概率': ['事件的可能性', '简单事件的概率', '用频率估计概率'],
    '九上·圆': ['圆的基本性质', '圆心角与圆周角', '弧弦圆心角关系', '直线与圆的位置关系', '正多边形与圆'],
    '九上·相似三角形': ['比例线段', '相似三角形判定', '相似三角形性质', '相似三角形的应用'],
    '九下·直角三角形': ['锐角三角函数', '解直角三角形', '三角函数应用'],
    '九下·直线与圆/多边形': ['直线与圆的位置关系(九下)', '三视图', '投影与视图', '多边形与四边形复习'],
    '九下·统计与概率': ['数据分析初步', '频数分布', '概率综合']
  },
  英语: {
    'Unit1-3 交际与自我': ['How can we become good learners?', 'I think that mooncakes are delicious', 'Could you please tell me where the restrooms are?', '宾语从句/定语从句复习'],
    'Unit4-6 人物与事物': ['I used to be afraid of the dark', 'What are the shirts made of?', 'When was it invented?', '被动语态'],
    'Unit7-9 规则与情感': ['Teenagers should be allowed to...', 'It must belong to Carla', 'I like music that I can dance to', '情态动词表推测', '定语从句(that/which)'],
    'Unit10-13 文化习俗': ['You are supposed to shake hands', 'Sad movies make me cry', 'We are trying to save the earth', 'make/sb+adj', '现在进行时/现在完成时'],
    'Unit14 回顾与写作': ['I remember meeting all of you', '书面表达', '完形填空策略', '阅读理解策略'],
    '中考题型': ['听力策略', '语法填空', '词汇运用', '任务型阅读']
  },
  科学: {
    '九上·物理': ['机械能', '内能', '电功与电功率', '简单磁现象', '家庭电路'],
    '九上·化学': ['物质鉴别', '化学反应与能量', '酸与碱', '盐与化肥', '金属与金属矿物'],
    '九上·生物': ['植物的生殖', '人体的新陈代谢(消化/呼吸/循环)'],
    '九上·地理': ['地壳运动与地形', '地球上的水'],
    '九下·物理': ['电磁波与信息', '能源与社会', '粒子与宇宙'],
    '九下·化学': ['有机物', '物质转化的规律', '物质的分类'],
    '九下·生物': ['遗传与进化', '生物与环境', '人的健康'],
    '九下·地理': ['天气与气候', '中国地理与区域差异'],
    '九下·综合探究': ['科学探究方法', '实验设计与数据分析']
  },
  道德与法治: {
    '九上·富强与创新': ['改革开放', '走向共同富裕', '创新改变生活', '创新永无止境'],
    '九上·民主与法治': ['生活在新型民主国家', '参与民主生活', '夯实法治基础', '凝聚法治共识'],
    '九上·文明与家园': ['守望精神家园', '建设美丽中国'],
    '九上·和谐与梦想': ['中华一家亲', '中国人中国梦'],
    '九下·世界与中国': ['同住地球村', '构建人类命运共同体', '与世界共发展', '走向未来的少年']
  },
  历史与社会: {
    '九上·中国与世界': ['列强侵略与中国人民抗争', '近代化的早期探索', '辛亥革命与民国初建', '新民主主义革命的兴起'],
    '九上·时代主题': ['战后世界格局', '中国抗日战争', '人民解放战争的胜利', '当代世界格局'],
    '九下·中国发展': ['走向社会主义之路', '中国特色社会主义道路', '民族团结与祖国统一'],
    '九下·社会与人文': ['人口资源环境与发展', '区域差异与区域发展', '文化多样性与中华文化', '法治社会与公民责任']
  }
};

// 中考常见考法标签（预置，覆盖主要知识点；"帮我总结"时 AI 可细化补充）
export const EXAM_FOCUS = {
  '沁园春·雪': [
    '名句默写',
    '景物描写动静结合',
    '作者情感与抱负'
  ],
  '乡愁/议论文阅读': [
    '意象分析',
    '论点论据判断',
    '语言品析'
  ],
  '敬业与乐业': [
    '论点提炼',
    '举例论证作用',
    '名言积累'
  ],
  '就英法联军远征中国致巴特勒上尉的信': [
    '反语讽刺手法',
    '作者立场',
    '书信体特点'
  ],
  '小说人物形象分析': [
    '人物描写方法',
    '性格概括',
    '形象作用'
  ],
  '论证思路与结构': [
    '论证结构（总分/递进）',
    '思路梳理题',
    '段落作用'
  ],
  '岳阳楼记': [
    '名句默写',
    '作者情感',
    '文言词语解释'
  ],
  '醉翁亭记': [
    '名句默写',
    '写景抒情',
    '文言词语解释'
  ],
  '湖心亭看雪': [
    '白描手法',
    '写景抒情',
    '文言词语解释'
  ],
  '诗词三首（行路难/酬乐天/水调歌头）': [
    '名句默写',
    '典故理解',
    '情感主旨'
  ],
  '文言文实词虚词': [
    '一词多义',
    '虚词用法（之/其/而）',
    '断句翻译'
  ],
  '观点要明确': [
    '论点表述',
    '立意明确',
    '材料支撑'
  ],
  '议论要言之有据': [
    '论据选用',
    '道理论据与事实论据',
    '论证严密性'
  ],
  '学习缩写/改写': [
    '要点保留',
    '人称转换',
    '语言简洁'
  ],
  '祖国啊我亲爱的祖国': [
    '意象的象征义',
    '反复修辞手法',
    '情感脉络'
  ],
  '孔乙己': [
    '人物形象',
    '讽刺手法',
    '主题探究'
  ],
  '变色龙': [
    '讽刺夸张',
    '人物性格变化',
    '社会环境烘托'
  ],
  '蒲柳人家': [
    '乡土风情描写',
    '人物形象',
    '语言特色'
  ],
  '小说鉴赏': [
    '情节概括',
    '环境描写作用',
    '主题探究'
  ],
  '鱼我所欲也': [
    '名句默写',
    '论证方法（对比/比喻）',
    '文言词语'
  ],
  '送东阳马生序': [
    '劝学主旨',
    '对比手法',
    '文言词语解释'
  ],
  '曹刿论战': [
    '文言词语',
    '论证思路',
    '名句默写'
  ],
  '邹忌讽齐王纳谏': [
    '讽谏艺术',
    '类比说理',
    '名句默写'
  ],
  '诗词曲五首': [
    '名句默写',
    '曲牌与题材',
    '情感主旨'
  ],
  '审题立意': [
    '审题方法',
    '立意深刻',
    '避免偏题'
  ],
  '布局谋篇': [
    '结构安排',
    '过渡照应',
    '详略得当'
  ],
  '创意表达': [
    '选材新颖',
    '表达个性化',
    '语言出彩'
  ],
  '二次函数概念与图象': [
    '图象性质选择题',
    '配方求顶点/对称轴',
    '与实际情境结合'
  ],
  '二次函数解析式': [
    '待定系数法求解析式',
    '三类形式互化'
  ],
  '二次函数与一元二次方程': [
    '图象与 x 轴交点',
    '判别式与根的关系'
  ],
  '二次函数的应用': [
    '利润/面积最值问题',
    '抛物线型实际问题'
  ],
  '事件的可能性': [
    '必然事件/随机事件',
    '可能性大小比较',
    '列举法'
  ],
  '简单事件的概率': [
    '古典概型计算',
    '树状图/列表法',
    '概率判断'
  ],
  '用频率估计概率': [
    '频率稳定性',
    '用样本估计总体',
    '实验频率'
  ],
  '圆的基本性质': [
    '垂径定理',
    '圆周角与圆心角',
    '对称性应用'
  ],
  '圆心角与圆周角': [
    '圆周角定理',
    '圆心角计算',
    '推论应用'
  ],
  '弧弦圆心角关系': [
    '弧弦圆心角互推',
    '等量关系证明',
    '辅助线作法'
  ],
  '直线与圆的位置关系': [
    '相切判定',
    '切线长定理',
    '圆心到直线距离'
  ],
  '正多边形与圆': [
    '内角/边数计算',
    '外接圆与内切圆',
    '面积计算'
  ],
  '比例线段': [
    '比例性质',
    '黄金分割',
    '平行线分线段'
  ],
  '相似三角形判定': [
    'AAS/SAS/AA 判定',
    '网格中的相似'
  ],
  '相似三角形性质': [
    '周长/面积比',
    '射影定理'
  ],
  '相似三角形的应用': [
    '测量高度/距离',
    '影子与镜面',
    '实际问题建模'
  ],
  '锐角三角函数': [
    '特殊角三角函数值',
    '由边长求三角函数值'
  ],
  '解直角三角形': [
    '仰角俯角测量',
    '坡度坡比'
  ],
  '三角函数应用': [
    '航海/坡度问题',
    '仰角俯角综合',
    '实际情境建模'
  ],
  '直线与圆的位置关系(九下)': [
    '切线证明',
    '切割线定理',
    '圆中计算'
  ],
  '三视图': [
    '识图与画法',
    '由视图想立体',
    '表面积体积'
  ],
  '投影与视图': [
    '平行投影/中心投影',
    '正投影性质',
    '视图还原'
  ],
  '多边形与四边形复习': [
    '特殊四边形判定',
    '性质综合',
    '中点四边形'
  ],
  '数据分析初步': [
    '平均数/中位数/众数',
    '方差意义',
    '数据解读'
  ],
  '频数分布': [
    '频数直方图',
    '频率计算',
    '分布表制作'
  ],
  '概率综合': [
    '复合事件概率',
    '游戏公平性',
    '与统计结合'
  ],
  'How can we become good learners?': [
    'how 引导疑问',
    '学习方式表达',
    '建议句型'
  ],
  'I think that mooncakes are delicious': [
    'that 宾语从句',
    '节日词汇',
    '定语从句'
  ],
  'Could you please tell me where the restrooms are?': [
    '礼貌请求',
    '宾语从句语序',
    '问路交际'
  ],
  '宾语从句/定语从句复习': [
    '从句语序',
    '连接词选择',
    '时态呼应'
  ],
  'I used to be afraid of the dark': [
    'used to 句型',
    '现在与过去对比',
    'used to/be used to'
  ],
  'What are the shirts made of?': [
    '被动语态（一般现在）',
    '材料词汇',
    'be made of/from'
  ],
  'When was it invented?': [
    '被动语态（过去时）',
    '发明类词汇',
    '一般疑问句'
  ],
  '被动语态': [
    '时态构成',
    '主动变被动',
    '中考单选'
  ],
  'Teenagers should be allowed to...': [
    '含情态被动',
    'should 表达',
    '许可与禁止'
  ],
  'It must belong to Carla': [
    'must 表肯定推测',
    'belong to 用法',
    '物品归属表达'
  ],
  'I like music that I can dance to': [
    '定语从句关系代词',
    'that/which 区别',
    '介词+which'
  ],
  '情态动词表推测': [
    'must/can’t/may 辨析',
    '推测句型'
  ],
  '定语从句(that/which)': [
    '关系代词选择',
    '从句语序',
    '先行词判断'
  ],
  'You are supposed to shake hands': [
    'be supposed to',
    '文化习俗词汇',
    '礼仪表达'
  ],
  'Sad movies make me cry': [
    'make+宾语+补语',
    '使役动词',
    '情感表达'
  ],
  'We are trying to save the earth': [
    '现在进行时',
    '环保词汇',
    '不定式目的'
  ],
  'make/sb+adj': [
    '使役结构',
    '形容词补语',
    '句型转换'
  ],
  '现在进行时/现在完成时': [
    '时态标志词',
    'have/has been',
    '时态辨析'
  ],
  'I remember meeting all of you': [
    'remember doing',
    '毕业话题词汇',
    '一般过去时回顾'
  ],
  '书面表达': [
    '应用文格式',
    '要点覆盖',
    '连接词使用'
  ],
  '完形填空策略': [
    '上下文逻辑',
    '词语辨析',
    '固定搭配'
  ],
  '阅读理解策略': [
    '主旨大意题',
    '细节理解题',
    '推断题技巧'
  ],
  '听力策略': [
    '关键词捕捉',
    '预测内容',
    '数字/时间听辨'
  ],
  '语法填空': [
    '词形变化',
    '语法结构判断',
    '上下文提示'
  ],
  '词汇运用': [
    '词性转换',
    '拼写准确',
    '语境选词'
  ],
  '任务型阅读': [
    '信息提取',
    '同义转换',
    '归纳填空'
  ],
  '机械能': [
    '动能势能转化',
    '机械能守恒条件',
    '实验探究'
  ],
  '内能': [
    '内能改变方式',
    '比热容计算',
    '热机效率'
  ],
  '电功与电功率': [
    '电功率计算',
    '电能表读数',
    '额定/实际功率'
  ],
  '简单磁现象': [
    '磁极相互作用',
    '磁场与磁感线',
    '奥斯特实验'
  ],
  '家庭电路': [
    '安全用电',
    '电路故障判断'
  ],
  '物质鉴别': [
    '离子鉴别',
    '气体检验',
    '实验现象判断'
  ],
  '化学反应与能量': [
    '放热吸热判断',
    '化学能与热能',
    '反应类型'
  ],
  '酸与碱': [
    '酸碱指示剂',
    '中和反应',
    'pH 判断'
  ],
  '盐与化肥': [
    '复分解反应条件',
    '化肥鉴别'
  ],
  '金属与金属矿物': [
    '金属活动性顺序',
    '置换反应'
  ],
  '植物的生殖': [
    '有性/无性生殖',
    '嫁接扦插',
    '花的结构与受精'
  ],
  '人体的新陈代谢(消化/呼吸/循环)': [
    '三大营养物质消化',
    '气体交换',
    '血液循环途径'
  ],
  '地壳运动与地形': [
    '板块构造',
    '地形类型判读',
    '地震火山'
  ],
  '地球上的水': [
    '水循环',
    '水资源分布',
    '水体类型'
  ],
  '电磁波与信息': [
    '电磁波谱',
    '电磁波应用',
    '信息传递'
  ],
  '能源与社会': [
    '能源分类',
    '新能源',
    '能量转化效率'
  ],
  '粒子与宇宙': [
    '物质构成粒子',
    '原子结构',
    '宇宙起源'
  ],
  '有机物': [
    '有机物特征',
    '糖类/脂肪/蛋白质',
    '甲烷与乙醇'
  ],
  '物质转化的规律': [
    '金属/酸碱盐转化图',
    '复分解条件',
    '推断题'
  ],
  '物质的分类': [
    '混合物/纯净物',
    '单质/化合物',
    '酸碱盐氧化物'
  ],
  '遗传与进化': [
    '基因显隐性',
    '遗传图解'
  ],
  '生物与环境': [
    '食物链/网',
    '生态系统能量流动'
  ],
  '人的健康': [
    '传染病预防',
    '免疫类型',
    '健康生活方式'
  ],
  '天气与气候': [
    '天气符号',
    '气候类型特征',
    '影响气候因素'
  ],
  '中国地理与区域差异': [
    '四大地理区域',
    '南北方差异',
    '区域特征'
  ],
  '科学探究方法': [
    '提出假设',
    '控制变量',
    '实验方案评价'
  ],
  '实验设计与数据分析': [
    '变量控制设计',
    '数据图表分析',
    '结论表述'
  ],
  '改革开放': [
    '意义选择题',
    '史料分析',
    '时间线'
  ],
  '走向共同富裕': [
    '共享发展成果',
    '乡村振兴',
    '辨析题'
  ],
  '创新改变生活': [
    '辨析题',
    '创新意义',
    '结合材料'
  ],
  '创新永无止境': [
    '教育/人才重要性',
    '自主创新',
    '结合材料'
  ],
  '生活在新型民主国家': [
    '社会主义民主特点',
    '民主形式',
    '选择题'
  ],
  '参与民主生活': [
    '公民参与途径',
    '民主监督',
    '权利义务'
  ],
  '夯实法治基础': [
    '法治意义',
    '良法善治',
    '依法治国'
  ],
  '凝聚法治共识': [
    '依法行政',
    '厉行法治',
    '法治与德治'
  ],
  '守望精神家园': [
    '中华文化特点',
    '民族精神',
    '文化自信'
  ],
  '建设美丽中国': [
    '生态文明',
    '绿色发展',
    '国策辨析'
  ],
  '中华一家亲': [
    '民族团结',
    '一国两制',
    '祖国统一'
  ],
  '中国人中国梦': [
    '中国梦内涵',
    '两个百年目标',
    '青年担当'
  ],
  '同住地球村': [
    '经济全球化',
    '文化多样性',
    '开放互动'
  ],
  '构建人类命运共同体': [
    '人类命运共同体内涵',
    '中国方案',
    '材料分析'
  ],
  '与世界共发展': [
    '机遇与挑战',
    '提升国际竞争力',
    '辨析题'
  ],
  '走向未来的少年': [
    '走向世界准备',
    '责任担当',
    '职业规划'
  ],
  '列强侵略与中国人民抗争': [
    '史实时间线',
    '条约内容',
    '材料分析'
  ],
  '近代化的早期探索': [
    '洋务运动',
    '戊戌变法',
    '史料分析'
  ],
  '辛亥革命与民国初建': [
    '辛亥革命意义',
    '民国建立',
    '时间线'
  ],
  '新民主主义革命的兴起': [
    '五四运动/中共成立',
    '井冈山道路',
    '史料分析'
  ],
  '战后世界格局': [
    '凡尔赛-华盛顿体系',
    '两极格局',
    '材料分析'
  ],
  '中国抗日战争': [
    '抗战史实',
    '重要战役',
    '历史意义'
  ],
  '人民解放战争的胜利': [
    '三大战役',
    '渡江战役',
    '史实时间线'
  ],
  '当代世界格局': [
    '多极化趋势',
    '冷战结束',
    '国际组织'
  ],
  '走向社会主义之路': [
    '新中国成立',
    '社会主义改造',
    '时间线'
  ],
  '中国特色社会主义道路': [
    '改革开放进程',
    '重大会议',
    '材料分析'
  ],
  '民族团结与祖国统一': [
    '民族区域自治',
    '港澳回归',
    '两岸关系'
  ],
  '人口资源环境与发展': [
    '可持续发展',
    '国情辨析',
    '对策建议'
  ],
  '区域差异与区域发展': [
    '因地制宜',
    '区域协调',
    '案例分析'
  ],
  '文化多样性与中华文化': [
    '文化认同',
    '文化交流',
    '传统文化保护'
  ],
  '法治社会与公民责任': [
    '法治精神',
    '公民责任',
    '权利义务统一'
  ]
};

export function getOutline() {
  return { outline: OUTLINE, examFocus: EXAM_FOCUS };
}

// 根据刷题/错题记录计算每个知识点的掌握度（0-100）
// 逻辑：答对率为主，错题扣分，连续正确加分；无记录则 0
export function computeMastery(userId) {
  const records = db.prepare(
    'SELECT subject,knowledge_point AS kp,correct FROM quiz_records WHERE user_id=?'
  ).all(userId);
  const mistakes = db.prepare(
    'SELECT subject,knowledge_point AS kp FROM mistakes WHERE user_id=?'
  ).all(userId);
  const stat = {};
  const bump = (key) => (stat[key] = stat[key] || { total: 0, right: 0, wrong: 0 });
  for (const r of records) {
    const k = r.subject + '||' + r.kp;
    const s = bump(k);
    s.total++;
    if (r.correct) s.right++; else s.wrong++;
  }
  for (const m of mistakes) {
    const k = m.subject + '||' + m.kp;
    bump(k).wrong++;
  }
  const result = {};
  for (const [k, s] of Object.entries(stat)) {
    const attempts = s.right + Math.min(s.wrong, 5); // 错题最多计 5 次惩罚，避免无限扣分
    const rate = attempts ? s.right / attempts : 0;
    // 映射：至少做过 1 题才有掌握度；满 5 题且全对接近 100
    const mastery = Math.round(rate * 100 * Math.min(1, (s.right + s.wrong) / 3));
    result[k] = Math.max(0, Math.min(100, mastery));
  }
  return result;
}

export function getMastery(userId) {
  const rows = db.prepare(
    'SELECT subject,chapter,knowledge_point,mastery FROM knowledge_mastery WHERE user_id=?'
  ).all(userId);
  const map = {};
  for (const r of rows) map[r.subject + '||' + r.knowledge_point] = r.mastery;
  return map;
}

// 统一掌握度口径：以刷题推导(computeMastery)为主；对"已总结但还没刷过题"的
// 知识点，用 getMastery 的复习掌握度填充，避免前端两套逻辑导致显示跳变。
export function mergeMastery(userId) {
  const computed = computeMastery(userId);
  const stored = getMastery(userId);
  const result = { ...computed };
  for (const [k, v] of Object.entries(stored)) {
    if (result[k] === undefined) result[k] = v; // 仅填充刷题无记录的点
  }
  return result;
}

export function setMastery(userId, subject, chapter, knowledgePoint, mastery, reviews) {
  db.prepare(`INSERT INTO knowledge_mastery (user_id,subject,chapter,knowledge_point,mastery,reviews)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(user_id,subject,chapter,knowledge_point)
    DO UPDATE SET mastery=excluded.mastery, reviews=excluded.reviews, updated_at=CURRENT_TIMESTAMP`)
    .run(userId, subject, chapter, knowledgePoint, mastery, reviews ?? 0);
}

export async function summarize(userId, { subject, chapter, knowledgePoint }) {
  // 本地预置总结卡（湖州中考向，不依赖 DeepSeek 即可用）
  const local = getLocalSummary(knowledgePoint);
  // 若有 Key 且调用成功，用 AI 真实总结；否则（演示/出错）用本地卡兜底
  let card;
  if (usingMock) {
    card = local || (await summarizeKnowledge({ subject, chapter, knowledgePoint }));
  } else {
    try {
      const ai = await summarizeKnowledge({ subject, chapter, knowledgePoint });
      card = { ...(local || {}), ...ai }; // AI 细化覆盖本地，本地保证有内容
    } catch {
      card = local || (await summarizeKnowledge({ subject, chapter, knowledgePoint }));
    }
  }
  // 复习=理解（封顶黄色），真正掌握（变绿）要靠刷题做对题
  const REVIEW_CAP = 59;
  const prevRow = db.prepare('SELECT mastery,reviews FROM knowledge_mastery WHERE user_id=? AND subject=? AND knowledge_point=?')
    .get(userId, subject, knowledgePoint);
  const prev = prevRow?.mastery;
  const firstTime = prev === undefined;
  let next;
  if (firstTime) next = Math.max(prev ?? 0, 20);
  else next = prev >= 60 ? prev : Math.min(REVIEW_CAP, (prev ?? 0) + 12); // 已变绿的保持，未绿的复习最多到黄
  const reviewCount = (prevRow?.reviews ?? 0) + 1; // 每次梳理计一次复习
  setMastery(userId, subject, chapter, knowledgePoint, next, reviewCount);
  // 中考考法：优先用 AI 返回的，否则回退到预置标签
  const examFocus = Array.isArray(card.examFocus) && card.examFocus.length
    ? card.examFocus
    : (EXAM_FOCUS[knowledgePoint] || []);
  // 积分：仅首次梳理给鼓励分，重复复习不再加星（避免反复点同一题刷分）
  const gained = firstTime ? 8 : 0;
  const { points, level } = addPoints(userId, gained);
  const { streak, unlockedBadges: streakBadges } = checkIn(userId); // 顺手完成当天连续天数打卡
  // 里程碑徽章：按已点亮知识点数（掌握度>0）解锁
  const litCount = db.prepare('SELECT COUNT(*) AS n FROM knowledge_mastery WHERE user_id=? AND mastery>0').get(userId).n;
  const unlockedBadges = [...checkMilestoneBadges(userId, litCount), ...streakBadges];
  return { ...card, examFocus, mastery: next, reviewCount, source: usingMock ? 'local' : 'ai', gained, points, level, streak, litCount, unlockedBadges };
}
