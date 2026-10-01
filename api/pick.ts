/**
 * Vercel Serverless Function：POST /api/pick  { theme }
 * 密钥只存在 Vercel 环境变量里，前端永不接触 TYPESAFE_API_KEY / DEEPSEEK_API_KEY
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pickStocks } from "../src/stocks/pipeline";

export const maxDuration = 60; // DeepSeek 生成 + Jev 判断链路较长

// ponytail: 进程内存限流（实例重启清零），挡住随意刷；要严格就上 WAF 或 Upstash
const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 10; // 每 IP 每小时
const WINDOW_MS = 3600_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "仅支持 POST" });
  }

  const theme = String((req.body as { theme?: unknown })?.theme ?? "").trim().slice(0, 30);
  if (!theme) {
    return res.status(400).json({ error: "请提供题材（theme）" });
  }

  const ip = String(req.headers["x-forwarded-for"] ?? "local").split(",")[0].trim();
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
  } else if (++h.n > LIMIT) {
    return res.status(429).json({ error: "请求太频繁，每小时最多 10 次" });
  }

  try {
    const result = await pickStocks(theme);
    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: `选股失败：${(e as Error).message ?? e}` });
  }
}
