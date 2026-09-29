/**
 * 场景 3.4：组合评分 —— Jev 只出判断，优先级权重在代码里调
 * 问一次 impact 和 frustration（这两个需要理解消息），
 * plan 和 waiting 是代码已知的事实，直接用。
 * 归一化到 0~1 后加权求和：score/2，plus=1，waiting=min(hours/24, 1)。
 *
 * 换权重不需要再问 Jev：权重 A 侧重产品影响 → T1 第一；
 * 权重 B 侧重情绪和等待 → 等了一天多的 T2 升到第一。
 */
import { score } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

interface Ticket {
  id: string;
  message: string;
  plan: "plus" | "standard";
  waitingHours: number;
}

const tickets: Ticket[] = [
  { id: "T1", message: "Headphones won't turn on.", plan: "plus", waitingHours: 2 },
  { id: "T2", message: "I'm very frustrated, this is the third time it's broken!", plan: "standard", waitingHours: 30 },
  { id: "T3", message: "How do I pair the case?", plan: "standard", waitingHours: 1 },
];

// 每张工单只问一次
const judged = new Map<string, { impact: number; frustration: number }>();
for (const t of tickets) {
  const r = await client.systemOne({
    state: { ticket: { message: t.message } },
    questions: {
      impact: score("How much does the problem stop the customer from using the product?", [
        "Not at all",
        "Partially",
        "Completely",
      ]),
      frustration: score("How frustrated is the customer?", [
        "Not frustrated",
        "Disappointed or annoyed",
        "Angry, making complaints",
      ]),
    },
  });
  show(r);
  judged.set(t.id, {
    impact: (r.answers.impact.score ?? 0) / 2,
    frustration: (r.answers.frustration.score ?? 0) / 2,
  });
}

function rank(tickets: Ticket[], w: { impact: number; frustration: number; plan: number; waiting: number }) {
  return tickets
    .map((t) => {
      const j = judged.get(t.id)!;
      const plan = t.plan === "plus" ? 1 : 0;
      const waiting = Math.min(t.waitingHours / 24, 1);
      return { id: t.id, score: j.impact * w.impact + j.frustration * w.frustration + plan * w.plan + waiting * w.waiting };
    })
    .sort((a, b) => b.score - a.score);
}

const weightsA = { impact: 0.5, frustration: 0.1, plan: 0.2, waiting: 0.2 };
const weightsB = { impact: 0.2, frustration: 0.4, plan: 0.1, waiting: 0.3 };

for (const [label, w] of [
  ["weights A (impact-focused)", weightsA],
  ["weights B (frustration + waiting)", weightsB],
] as const) {
  console.log(`\n--- ${label} ---`);
  for (const { id, score } of rank(tickets, w)) {
    console.log(`  ${id}: ${score.toFixed(3)}`);
  }
}
