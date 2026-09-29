/**
 * 场景 1.4：只给相关信息
 * Maya 的历史工单里有两条旧的愤怒投诉，但最新一条是满意的。
 * ❌ 发整个工单历史 → isFrustrated 0.77，811 in tokens（旧投诉带偏了判断）
 * ✅ 只发最新一条 → isFrustrated 0.19，440 in tokens（约一半开销）
 *
 * 结论：无关信息会分散模型注意力（官方列出的已知弱点），且按输入 token 计费。
 * 当前对话只发当前工单；只有问"长期体验"时才带上历史。
 */
import { noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const customer = { name: "Maya", plan: "plus" };
const history = [
  { subject: "Delayed replacement", message: "It's been 10 days and nothing has arrived. This is really frustrating." },
  { subject: "Duplicate charge", message: "I was charged twice for my case order. I'm getting tired of these problems." },
  { subject: "Replacement arrived", message: "The replacement arrived today and works perfectly. Thanks for sorting it out so quickly." },
];
const question = { isFrustrated: noul("Is the customer frustrated?") };

console.log("--- ❌ full history ---");
show(
  await client.systemOne({
    state: { customer, ticketHistory: history },
    questions: question,
  }),
);

console.log("--- ✅ latest ticket only ---");
show(
  await client.systemOne({
    state: { customer, ticket: history[history.length - 1] },
    questions: question,
  }),
);
