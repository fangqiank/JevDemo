/**
 * 场景 1.3：能算的先在代码里算好，别让 Jev 做计算
 * 套餐：购买 1 年内出问题免费换新。测试购买于 2 / 10 / 13 个月前。
 * ❌ 发原始日期让 Jev 自己比对：0.93 / 0.74 / 0.38 —— 13 个月那份答案含糊
 * ✅ 代码算好 monthsAgo 再发：0.96 / 0.94 / 0.08 —— 边界清晰
 *
 * 结论：日期差、查找类（把 author ID 解析成 customer/agent）都在代码里先做。
 */
import { noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const purchasedMonthsAgo = [2, 10, 13];
const planBenefits = ["Free replacement for faulty items within 1 year"];

console.log("--- ❌ raw dates ---");
for (const m of purchasedMonthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  const r = await client.systemOne({
    state: {
      today: new Date().toISOString().slice(0, 10),
      purchasedAt: d.toISOString().slice(0, 10),
      planBenefits,
    },
    questions: { covered: noul("Is the order still covered by the plan benefits?") },
  });
  console.log(`purchase ${m} months ago:`);
  show(r);
}

console.log("--- ✅ precomputed monthsAgo ---");
for (const m of purchasedMonthsAgo) {
  const r = await client.systemOne({
    state: { monthsAgo: m, planBenefits },
    questions: { covered: noul("Is an order purchased `monthsAgo` months ago still covered by the plan benefits?") },
  });
  console.log(`purchase ${m} months ago:`);
  show(r);
}
