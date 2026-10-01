/**
 * 选股流水线（CLI 与 Web 共用）：
 * DeepSeek 生成候选池（state）→ Jev 一次批量判断（fit noul + centrality score）→ 代码组合
 */
import { noul, score, type EntryType } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { fetchUniverse, type Stock } from "./deepseek";

export interface PickRow extends Stock {
  fit: number;
  centrality: number;
}

export interface PickResult {
  theme: string;
  poolSize: number;
  usage: { input_tokens: number; output_tokens: number } | null;
  eligible: PickRow[];
  watch: PickRow[];
  rest: number;
}

function makeQuestions(theme: string, universe: Stock[]) {
  const qs: Record<string, ReturnType<typeof noul> | ReturnType<typeof score>> = {};
  for (const s of universe) {
    // 问题 ID 里的 ticker 只是给代码用的，模型看到的是 instruction 全文
    qs[`fit_${s.ticker}`] = noul(`Does \`${s.code}\` (${s.ticker}, ${s.name}) belong to the theme "${theme}"?`, {
      true: "主营收入主要来自该题材相关业务。",
      false: "相关收入很少或没有，或仅有传闻、意向公告，尚无实际业务。",
    });
    qs[`centrality_${s.ticker}`] = score(`How central is "${theme}" to \`${s.code}\` (${s.ticker}, ${s.name})'s business?`, [
      "基本无关，无相关业务或仅蹭概念",
      "沾边，相关收入占比很小",
      "重要业务线，相关收入占比较高",
      "核心主业，收入主要来自该题材",
    ]);
  }
  return qs;
}

export async function pickStocks(theme: string): Promise<PickResult> {
  const universe = await fetchUniverse(theme);
  const r = await client.systemOne({
    // state 运行时就是纯 JSON；SDK 的 EntryType 是递归类型，TS 无法从 interface 直接验证
    state: { theme, stocks: universe } as unknown as EntryType,
    questions: makeQuestions(theme, universe),
  });

  const rows: PickRow[] = universe.map((s) => ({
    ...s,
    fit: (r.answers[`fit_${s.ticker}`] as { noul?: number }).noul ?? 0,
    centrality: (r.answers[`centrality_${s.ticker}`] as { score?: number }).score ?? 0,
  }));

  // 代码组合：fit 过阈值入池，centrality 排序 —— 调阈值/取几名都不用重新问 Jev
  const eligible = rows.filter((x) => x.fit >= 0.8).sort((a, b) => b.centrality - a.centrality);
  const watch = rows.filter((x) => x.fit >= 0.5 && x.fit < 0.8).sort((a, b) => b.centrality - a.centrality);

  return {
    theme,
    poolSize: universe.length,
    usage: r.usage ?? null,
    eligible,
    watch,
    rest: rows.length - eligible.length - watch.length,
  };
}
