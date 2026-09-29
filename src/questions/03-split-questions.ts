/**
 * 场景 2.3：一个问题别让 Jev 判断太多东西 —— 拆开，让代码组合
 *
 * A) ❌ 一个笼统的 "Should this ticket be escalated?"：策略没告诉 Jev，
 *    只能靠猜（manager 0.91 / dispute 0.83 / disappointed 0.72 / cancel 0.31），且无法审计
 * ✅ 按策略关心的点各问一个 noul，代码用 `some(p >= 0.8)` 组合判断：
 *    每个判断可单独检查，策略变化只改代码不用改问题
 * C) 复合条件同理："angry AND wants refund" 合并问 → 0.39，不知道哪个成立；
 *    ✅ 拆开问 → 各得清晰答案，代码按需使用
 */
import { noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const messages = [
  "Could you help me connect my headphones?",
  "I want to speak to a manager.",
  "I've contacted my bank about this unauthorized charge.",
  "Another pair has broken. I'm really disappointed.",
  "Fix this or I'm cancelling my subscription.",
];

const escalationQuestions = () => ({
  manager: noul("Does the message ask to speak to a manager?"),
  cancelThreat: noul("Does the message threaten to cancel or leave?"),
  legalOrBank: noul("Does the message mention legal action or a bank dispute?"),
  contactedBefore: noul("Does the message say the customer has contacted support before?"),
});

for (const message of messages) {
  const state = { ticket: { message } };
  console.log(`\n"${message}"`);

  console.log("--- A) ❌ one vague question ---");
  show(
    await client.systemOne({
      state,
      questions: { escalated: noul("Should this ticket be escalated?") },
    }),
  );

  console.log("--- B) ✅ split judgments + code rule ---");
  const r = await client.systemOne({ state, questions: escalationQuestions() });
  show(r);
  const escalate = Object.values(r.answers).some((a) => (a.noul ?? 0) >= 0.8);
  console.log(`  escalate (any p >= 0.8): ${escalate}`);
}

// C) 复合条件：合并 vs 拆开
const crackedCase = { ticket: { message: "The headphones arrived with a cracked case. Could I get a refund, please?" } };
console.log("\n--- C) ❌ combined 'angry and wants refund' ---");
show(
  await client.systemOne({
    state: crackedCase,
    questions: { angryAndWantsRefund: noul("Is the customer angry and requesting a refund?") },
  }),
);
console.log("--- C) ✅ separate ---");
const split = await client.systemOne({
  state: crackedCase,
  questions: {
    angry: noul("Is the customer angry?"),
    wantsRefund: noul("Does the message ask for a refund?"),
  },
});
show(split);
