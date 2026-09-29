/**
 * 场景 3.1：意图路由 —— Jev 判断"是什么"，代码决定"做什么"
 * 策略：plus 用户购买 12 个月内产品故障 → 免费换新；查物流 → 发链接；
 * 退货 → 发退货标签；一个问题里多个问题 → 转人工。
 *
 * 注意 state 只放 message：plan 和购买日期留在代码里，
 * 这些是代码能直接查的事实，不该让 Jev 再判一遍。
 *
 * 视频实测：Maya（plus，2 个月）→ 换新；Sam（13 个月，同样的话）→ 转人工；
 * 物流 → 链接；退货 → 标签；Nenah 多问题 → 人工（即使 intent 判成 faulty）。
 */
import { choice, noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

interface Ticket {
  customer: string;
  message: string;
  plan: "plus" | "standard";
  monthsAgo: number;
}

async function handle(t: Ticket): Promise<string> {
  const r = await client.systemOne({
    state: { ticket: { message: t.message } },
    questions: {
      intent: choice("What does the customer need?", {
        faulty_product: "The product is not working or is damaged",
        order_status: "Where an order is or when it will arrive",
        return: "Wants to send a working product back",
        other: "Something else",
      }),
      multipleProblems: noul("Does the message describe several separate problems?"),
    },
  });
  show(r);

  // 先看是否多个问题（策略优先）
  if ((r.answers.multipleProblems.noul ?? 0) > 0.8) {
    return "→ human agent (several problems)";
  }
  switch (r.answers.intent.choice) {
    case "faulty_product":
      // 换新政策在代码里检查：plan + 日期差都是代码能直接算的事实
      return t.plan === "plus" && t.monthsAgo <= 12
        ? "→ free replacement (plus plan, within 12 months)"
        : "→ human agent (out of policy)";
    case "order_status":
      return "→ send tracking link";
    case "return":
      return "→ send return label";
    default:
      return "→ general queue";
  }
}

const tickets: Ticket[] = [
  { customer: "Maya", message: "My headphones won't turn on.", plan: "plus", monthsAgo: 2 },
  { customer: "Sam", message: "My headphones won't turn on.", plan: "standard", monthsAgo: 13 },
  { customer: "Chris", message: "Where is my order? It's been a week and tracking hasn't updated.", plan: "standard", monthsAgo: 1 },
  { customer: "Riley", message: "I'd like to return these earbuds — they work fine, I just prefer the over-ear model.", plan: "plus", monthsAgo: 3 },
  { customer: "Nenah", message: "The charging case won't charge, and I was also billed twice this month.", plan: "plus", monthsAgo: 6 },
];

for (const t of tickets) {
  console.log(`\n${t.customer} (${t.plan}, bought ${t.monthsAgo} months ago): "${t.message}"`);
  const action = await handle(t);
  console.log(`  ${action}`);
}
