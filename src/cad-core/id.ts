export function createId(prefix: string) {
  // MVP: 安定性より簡易性優先（UUIDは不要）
  const rand = Math.random().toString(16).slice(2, 10);
  const time = Date.now().toString(16);
  return `${prefix}_${time}_${rand}`;
}

