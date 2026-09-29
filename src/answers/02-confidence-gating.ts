/**
 * 场景 3.2：拿到答案 ≠ 直接行动 —— 用不确定性决定行动方式
 * choice / score 看 confidence（选项概率分布的集中程度）；
 * noul 没有 confidence，直接用"是"的概率。
 *
 * A) choice 三档：confidence >= 0.9 直接执行 / 0.6~0.9 跟客户确认 / < 0.6 转人工
 * B) noul 三档：p >= 0.8 走退款 / p <= 0.2 不启动 / 中间转人工
 *
 * 视频实测：清晰退款 → billing 0.98 直接执行；含糊工单 → 0.72 跟客户确认；
 * 两件事混在一起 → 0.59 人工分流。
 * 高置信度也不保证正确 —— 阈值要拿自己的数据测。
 */
import { choice, noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

// A) choice + confidence 三档
async function routeByTeam(message: string): Promise<string> {
  const r = await client.systemOne({
    state: { ticket: { message } },
    questions: {
      team: choice("Which team should handle this message?", {
        billing: "Charges, invoices, refunds, payments",
        orders: "Order status, delivery, returns",
        account: "Login, password",
        product: "Pairing, charging, sound quality",
      }),
    },
  });
  show(r);
  const { choice: team, confidence } = r.answers.team;
  if (confidence >= 0.9) return `auto → ${team}`;
  if (confidence >= 0.6) return `ask customer to confirm: is this about ${team}?`;
  return "→ human triage";
}

console.log("--- A) choice: confidence tiers ---");
for (const m of [
  "My return was delivered to your warehouse. Where is my refund?",
  "Something's wrong with my order and my account. Can someone help?",
  "I returned my charging case 2 weeks ago. Has it arrived yet? And when do I see the refund?",
]) {
  console.log(`\n"${m}"`);
  console.log(`  ${await routeByTeam(m)}`);
}

// B) noul + probability 三档
async function refundFlow(message: string): Promise<string> {
  const r = await client.systemOne({
    state: { ticket: { message } },
    questions: {
      wantsRefund: noul("Does the customer want a refund?", {
        true: "Asks for money back to their card, including a partial refund.",
        false: "Asks for an exchange, replacement, or store credit, or only asks what options exist.",
      }),
    },
  });
  show(r);
  const p = r.answers.wantsRefund.noul ?? 0;
  if (p >= 0.8) return "start refund process";
  if (p <= 0.2) return "no refund process";
  return "→ person decides";
}

console.log("\n--- B) noul: probability tiers ---");
for (const m of [
  "Can I get my money back please?",
  "I'm just checking what my options are for this broken pair.",
  "Not sure yet — maybe a replacement, maybe something else.",
]) {
  console.log(`\n"${m}"`);
  console.log(`  ${await refundFlow(m)}`);
}
