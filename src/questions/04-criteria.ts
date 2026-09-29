/**
 * 场景 2.4：用 criteria 明确定义每个答案的含义
 * instruction 说"判断什么"，criteria 说"每个答案算什么"。
 * 注意：noul 的 criteria 只认 true / false 两个键；choice / score 的结构是自定义的
 * （summary、covers、signals 等字段名随意），写成对象或字符串数组都行。
 *
 * A) noul：没定义"退款"边界 → "send them back" 0.66 含糊；
 *    ✅ 定义 true/false → 边界清晰（send back 降到 0.29）
 * B) choice：orders/billing 边界没说清 → 两单被分开处理；
 *    ✅ 每个选项写成 {summary, covers, doesNotCover} → 都归 billing
 * C) score：讽刺语气没定义落在哪级 → 落在级间且 confidence 低；
 *    ✅ 每级写成 {summary, signals} → 级别明确且置信度高
 */
import { choice, noul, score } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

// A) noul 的 criteria
const refundMessages = [
  "Can I get my money back?",
  "Can I get a partial refund?",
  "Can I get store credit instead?",
  "Can I send them back?",
];
for (const message of refundMessages) {
  const state = { ticket: { message } };
  console.log(`\n"${message}"`);
  console.log("--- A) ❌ no criteria ---");
  show(
    await client.systemOne({
      state,
      questions: { wantsRefund: noul("Does the customer want a refund?") },
    }),
  );
  console.log("--- A) ✅ with true/false criteria ---");
  show(
    await client.systemOne({
      state,
      questions: {
        wantsRefund: noul("Does the customer want a refund?", {
          true: "Asks for money back to their card, including a partial refund.",
          false: "Asks for an exchange, replacement, or store credit, or only asks what options exist.",
        }),
      },
    }),
  );
}

// B) choice 的 criteria：把团队边界写清楚
const boundaryMessages = [
  "Has my return arrived? And when will I get my refund?",
  "My return was delivered to your warehouse. Where is my refund?",
];
const simpleTeam = () =>
  choice("Which team should handle this message?", {
    orders: "Returns and delivery",
    billing: "Refunds and payments",
  });
const detailedTeam = () =>
  choice("Which team should handle this message?", {
    orders: {
      summary: "Handles returns and delivery",
      covers: "Sending an item back, return shipment status, delivery status",
      doesNotCover: "Refund processing once the return has arrived",
    },
    billing: {
      summary: "Handles refunds and payments",
      covers: "Refund status, charges, invoices",
      doesNotCover: "Sending an item back, return shipment",
    },
  });
for (const message of boundaryMessages) {
  const state = { ticket: { message } };
  console.log(`\n"${message}"`);
  console.log("--- B) ❌ vague option descriptions ---");
  show(await client.systemOne({ state, questions: { team: simpleTeam() } }));
  console.log("--- B) ✅ covers / doesNotCover ---");
  show(await client.systemOne({ state, questions: { team: detailedTeam() } }));
}

// C) score 的 criteria：等级写成 {summary, signals}
const sarcasticMessages = [
  "Great, the second pair broke too. Love that for me.",
  "Oh wonderful, another week without headphones. Thanks so much.",
  "If this breaks again, I'm done with you guys.",
];
for (const message of sarcasticMessages) {
  const state = { ticket: { message } };
  console.log(`\n"${message}"`);
  console.log("--- C) ❌ plain levels ---");
  show(
    await client.systemOne({
      state,
      questions: {
        frustration: score("How frustrated is the customer?", [
          "Not frustrated",
          "Disappointed or annoyed",
          "Angry, making complaints",
        ]),
      },
    }),
  );
  console.log("--- C) ✅ levels with summary + signals ---");
  show(
    await client.systemOne({
      state,
      questions: {
        frustration: score("How frustrated is the customer?", [
          { summary: "Not frustrated", signals: "Neutral, polite, purely informational" },
          { summary: "Disappointed or annoyed", signals: "Mentions a related problem, sarcasm, or a sigh, without threats" },
          { summary: "Angry, making complaints", signals: "Angry wording, complaints, threats to cancel or leave" },
        ]),
      },
    }),
  );
}
