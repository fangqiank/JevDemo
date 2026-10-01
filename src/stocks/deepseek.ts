/**
 * 用 DeepSeek（OpenAI 兼容接口）为题材生成候选股票池，作为 Jev 的 state 来源
 * 分工：DeepSeek 出候选（生成型知识），Jev 做判断（校准语义评估），代码做组合
 * 注意：候选来自 DeepSeek 的训练知识，无实时行情；代码仅演示该模式
 */
export interface Stock {
  ticker: string;
  code: string;
  name: string;
  business: string;
  segments: { name: string; pct: number }[];
  recentNews: string;
}

export async function fetchUniverse(theme: string, n = 12): Promise<Stock[]> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("请在 .env 中设置 DEEPSEEK_API_KEY");

  const base = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是 A 股研究助理，只输出 JSON。" },
        {
          role: "user",
          content:
            `列出 ${n} 只与 A 股题材"${theme}"相关的候选股票（包含主业直接相关、边缘相关和少量蹭概念的公司，便于对比）。` +
            `只输出 JSON：{"stocks":[{"ticker":"英文简称","code":"6位代码加.SH或.SZ","name":"公司名",` +
            `"business":"一句话主营业务，要具体","segments":[{"name":"业务名","pct":收入占比0-100}],` +
            `"recentNews":"一句话近期事件，要具体"}]}。segments 的 pct 合计约 100。`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek 请求失败 ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 返回为空");

  let parsed: { stocks?: unknown[] };
  try {
    parsed = JSON.parse(content) as { stocks?: unknown[] };
  } catch {
    throw new Error(`DeepSeek 返回不是合法 JSON：${content.slice(0, 200)}`);
  }

  // 外部数据 = 信任边界：逐条校验，缺字段的丢弃
  const stocks = (parsed.stocks ?? [])
    .map(toStock)
    .filter((s): s is Stock => s !== null);
  if (stocks.length === 0) throw new Error("DeepSeek 未生成有效候选");
  return stocks;
}

function toStock(x: unknown): Stock | null {
  if (typeof x !== "object" || x === null) return null;
  const s = x as Record<string, unknown>;
  if (typeof s.ticker !== "string" || typeof s.name !== "string" || typeof s.business !== "string") return null;
  const segments = Array.isArray(s.segments)
    ? s.segments.filter(
        (seg): seg is { name: string; pct: number } =>
          typeof seg === "object" && seg !== null &&
          typeof (seg as Record<string, unknown>).name === "string" &&
          typeof (seg as Record<string, unknown>).pct === "number",
      )
    : [];
  return {
    ticker: s.ticker,
    code: typeof s.code === "string" ? s.code : s.ticker,
    name: s.name,
    business: s.business,
    segments,
    recentNews: typeof s.recentNews === "string" ? s.recentNews : "",
  };
}
