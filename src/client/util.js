// 共享工具：把知识大纲拍平成 [{subject, chapter, kp}] 列表
export function flatKps(outline) {
  const arr = [];
  for (const subject in outline) {
    for (const chapter in outline[subject]) {
      for (const kp of outline[subject][chapter]) arr.push({ subject, chapter, kp });
    }
  }
  return arr;
}
