/**
 * 场景 1.2：对话记录怎么结构化？
 * ❌ 一整段字符串：Jev 得自己猜谁说了哪句（askedForRefund ≈0.8，偏高了）
 * ❌ 按说话人分组：有了标签但对话顺序断了，"Yeah sure" 在回答哪个问题看不出来
 *    （refund ≈0.55 更含糊，cancel 0.99→0.84）
 * ✅ [{speaker, text}] 数组按对话顺序：谁说的、在回复什么一目了然
 *
 * 视频实测：refund ≈0.3（正确偏向"没主动要退款"），cancel ≈0.99。
 * 结构取决于问题需要 Jev 理解什么关系 —— 这里是"谁说了哪句、在回复什么"。
 */
import { noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const turns = [
  { speaker: "agent", text: "I have two options. I can send a new pair or refund you in full." },
  { speaker: "customer", text: "What would you do?" },
  { speaker: "agent", text: "I would take the refund." },
  { speaker: "customer", text: "Okay." },
  { speaker: "agent", text: "Shall we cancel the charging case?" },
  { speaker: "customer", text: "Yeah sure." },
];

const questions = {
  askedForRefund: noul("Did the customer ask for a refund?", {
    true: "The customer themselves requested a refund.",
    false: "The customer merely accepted a refund the agent offered.",
  }),
  agreedToCancel: noul("Did the customer agree to cancel the charging case?"),
};

// ❌ 一整段字符串，没有说话人标签
console.log("--- ❌ plain string ---");
show(
  await client.systemOne({
    state: { transcript: turns.map((t) => t.text).join(" ") },
    questions,
  }),
);

// ❌ 按说话人分组，对话顺序丢失
console.log("--- ❌ grouped by speaker ---");
show(
  await client.systemOne({
    state: {
      customer: turns.filter((t) => t.speaker === "customer").map((t) => t.text),
      agent: turns.filter((t) => t.speaker === "agent").map((t) => t.text),
    },
    questions,
  }),
);

// ✅ 数组 + 说话人 + 按对话顺序
console.log("--- ✅ array of {speaker, text} ---");
show(await client.systemOne({ state: { transcript: turns }, questions }));
