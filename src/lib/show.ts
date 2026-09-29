// 统一打印一批答案和 token 用量
type AnyAnswer = {
  type: string;
  noul?: number;
  choice?: string;
  score?: number;
  confidence?: number;
};

export function show(result: {
  answers: Record<string, AnyAnswer>;
  usage?: { input_tokens: number; output_tokens: number } | null;
}): void {
  for (const [id, a] of Object.entries(result.answers)) {
    const v =
      a.type === "noul"
        ? `noul=${fmt(a.noul)}`
        : a.type === "choice"
          ? `choice=${a.choice} (confidence=${fmt(a.confidence)})`
          : `score=${a.score} (confidence=${fmt(a.confidence)})`;
    console.log(`  ${id}: ${v}`);
  }
  if (result.usage) {
    console.log(`  [tokens] in=${result.usage.input_tokens} out=${result.usage.output_tokens}`);
  }
}

const fmt = (n: number | undefined) => (n ?? 0).toFixed(2);
