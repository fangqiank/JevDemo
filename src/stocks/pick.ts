/**
 * CLI 入口：读题材，调用共享流水线，打印结果
 * 运行：npm run stocks            （交互循环）
 *       npm run stocks -- "AI"    （单次）
 */
import readline from "node:readline/promises";
import { pickStocks } from "./pipeline";

function print(r: Awaited<ReturnType<typeof pickStocks>>): void {
  console.log(`候选池：DeepSeek 生成 ${r.poolSize} 只 · Jev 一次批量请求`);
  if (r.usage) console.log(`[tokens] in=${r.usage.input_tokens} out=${r.usage.output_tokens}`);

  if (r.eligible.length === 0) {
    console.log("✅ 入选：无 —— 没有候选真正属于该题材，如实报告，不硬选");
  } else {
    console.log(`✅ 入选（fit ≥ 0.8，按题材中心度取前 3）`);
    for (const [i, x] of r.eligible.slice(0, 3).entries()) {
      console.log(`  ${i + 1}. ${x.ticker} ${x.name}（${x.code}）  fit=${x.fit.toFixed(2)}  centrality=${x.centrality.toFixed(2)}`);
      console.log(`     ${x.business}；${x.recentNews}`);
    }
  }
  if (r.watch.length > 0) {
    console.log("👁 观察名单（0.5 ≤ fit < 0.8）");
    for (const x of r.watch) {
      console.log(`  ${x.ticker} ${x.name}（${x.code}）  fit=${x.fit.toFixed(2)}  centrality=${x.centrality.toFixed(2)}  — ${x.recentNews}`);
    }
  }
  console.log(`❌ 未入选：${r.rest} 只`);
}

const argTheme = process.argv[2];
if (argTheme) {
  print(await pickStocks(argTheme));
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("输入题材让 Jev 选股（如：AI、新能源、医药），直接回车退出。");
  while (true) {
    const theme = (await rl.question("\n题材> ")).trim();
    if (!theme) break;
    print(await pickStocks(theme));
  }
  rl.close();
}
