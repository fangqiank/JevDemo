/**
 * 场景 2.1：什么时候用 noul，什么时候用 choice？
 *
 * A) ❌ 每个团队一个 noul：billing 0.97、account 0.99 同时为真 —— 但工单只能给一个团队
 * B) ✅ choice：互斥选项里选一个 → account 0.91（先能登录才拿得到发票，合理）
 * C) 打标签（可同时为真）：choice 只返回一个 → 漏掉 billing；✅ 每个主题独立 noul + 阈值
 * D) 选项没覆盖的情况：choice 被迫硬选（orders，confidence 0.46）；
 *    ✅ 加 "other" 选项 → other 0.99，代码可单独处理
 *
 * 结论：代码需要一个答案 → choice（列表不全就加 other）；
 * 多个条件可能同时为真 → 每个条件一个 noul。
 */
import { choice, noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

// A) ❌ 四个团队各问一个 noul
const invoiceAndLogin = {
  ticket: {
    message:
      "I need an invoice for my expense claim but I can't log in, " +
      "and the password reset email isn't arriving.",
  },
};
const teamNouls = {
  billing: noul("Is the message about charges, invoices, refunds or payments?"),
  orders: noul("Is the message about order status, delivery or returns?"),
  account: noul("Is the message about login or password?"),
  product: noul("Is the message about pairing, charging or sound quality?"),
};
console.log("--- A) ❌ one noul per team ---");
show(await client.systemOne({ state: invoiceAndLogin, questions: teamNouls }));

// B) ✅ choice：选一个团队
const teamChoice = () =>
  choice("Which team should handle this message?", {
    billing: "Charges, invoices, refunds, payments",
    orders: "Order status, delivery, returns",
    account: "Login, password",
    product: "Pairing, charging, sound quality",
    other: "Doesn't fit any other team",
  });
console.log("--- B) ✅ choice ---");
show(
  await client.systemOne({
    state: invoiceAndLogin,
    questions: { team: teamChoice() },
  }),
);

// C) ❌ choice 当标签用 → 只得到 orders；✅ 独立 noul → billing + orders 都拿到
const doubleIssue = {
  ticket: {
    message:
      "I ordered the charging case on the 10th and tracking hasn't updated in 5 days. " +
      "Also, can you confirm you only charged me once? My bank shows two pending payments.",
  },
};
console.log("--- C) ❌ choice as tag ---");
show(
  await client.systemOne({
    state: doubleIssue,
    questions: { tag: choice("Which topic does this message cover?", {
      billing: "Charges, invoices, refunds, payments",
      orders: "Order status, delivery, returns",
    }) },
  }),
);
console.log("--- C) ✅ separate nouls as tags ---");
const tagAnswer = await client.systemOne({
  state: doubleIssue,
  questions: {
    billing: teamNouls.billing,
    orders: teamNouls.orders,
  },
});
show(tagAnswer);
const tags = Object.entries(tagAnswer.answers)
  .filter(([, a]) => (a.noul ?? 0) >= 0.5)
  .map(([id]) => id);
console.log(`  active tags (>=0.5): ${tags.join(", ")}`);

// D) ❌ 没有覆盖的选项 → 被迫硬选；✅ 加 other
const storeQuestion = {
  ticket: { message: "Is there a store in Amsterdam where I can try the headphones?" },
};
console.log("--- D) ❌ no 'other' option ---");
show(
  await client.systemOne({
    state: storeQuestion,
    questions: {
      team: choice("Which team should handle this message?", {
        billing: "Charges, invoices, refunds, payments",
        orders: "Order status, delivery, returns",
        account: "Login, password",
        product: "Pairing, charging, sound quality",
      }),
    },
  }),
);
console.log("--- D) ✅ with 'other' ---");
show(
  await client.systemOne({
    state: storeQuestion,
    questions: { team: teamChoice() },
  }),
);
