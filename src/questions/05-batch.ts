/**
 * 场景 2.5：互不依赖的问题批量发，一次请求
 * ❌ for 循环逐个问：7 次请求，状态重复发 7 遍（视频实测 ~2 秒 / 2829 in tokens）
 * ✅ 一个请求 7 个问题：并行执行，状态只发一次（几百毫秒 / 639 in tokens）
 *
 * 每个问题仍独立判断：能用 state，但看不到同批其他问题的答案。
 * 只有"第二个问题需要第一个问题的答案来准备"时才需要第二次请求。
 */
import { choice, noul, score } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const state = {
  ticket: {
    message:
      "My wireless headphones stopped charging and I need them for work. " +
      "I've already tried two different cables and a different socket. " +
      "If they can't be fixed I'd like a refund. " +
      "Also I think I was charged twice for the case last month.",
  },
};

const makeQuestions = () => ({
  team: choice("Which team should handle this message?", {
    billing: "Charges, invoices, refunds, payments",
    orders: "Order status, delivery, returns",
    product: "Pairing, charging, sound quality",
    other: "Doesn't fit any other team",
  }),
  frustration: score("How frustrated is the customer?", [
    "Not frustrated",
    "Disappointed or annoyed",
    "Angry, making complaints",
  ]),
  urgent: noul("Is the customer blocked from working and asking for urgency?"),
  faulty: noul("Does the message describe a faulty product?"),
  tried: noul("Does the message say what the customer has already tried?"),
  wantsRefund: noul("Does the customer want a refund?"),
  incorrectCharge: noul("Does the message report an incorrect charge?"),
});

// ❌ 逐个请求
const questions = makeQuestions();
const t0 = performance.now();
let seqTokens = 0;
console.log("--- ❌ one request per question ---");
for (const [id, q] of Object.entries(questions)) {
  const r = await client.systemOne({ state, questions: { [id]: q } });
  seqTokens += r.usage?.input_tokens ?? 0;
  console.log(`  ${id}: asked separately`);
  show(r);
}
const seqMs = performance.now() - t0;
console.log(`  => ${Object.keys(questions).length} requests, ${seqMs.toFixed(0)} ms, ${seqTokens} in tokens`);

// ✅ 批量：一个请求
const t1 = performance.now();
const batched = await client.systemOne({ state, questions: makeQuestions() });
const batchMs = performance.now() - t1;
console.log("--- ✅ all in one request ---");
show(batched);
console.log(`  => 1 request, ${batchMs.toFixed(0)} ms`);
