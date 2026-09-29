/**
 * 场景 1.1：状态用纯文本还是对象？
 * ❌ 纯文本：信息都在，但字段语义模糊，问题无法引用字段名
 * ✅ 对象：ticket / customer / order 各归各位，问题可直接引用 `ticket.message`、`customer.planBenefits`
 *
 * 视频实测：两种格式结果接近（faulty ≈0.9+，covered ≈0.9+）。
 * 结论：只检查一段文本，string 够用；多块相关信息，用对象。
 */
import { noul } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const message = "My wireless headphones stopped charging after 2 months.";

// ❌ 把所有信息拼成一个字符串
const asString = await client.systemOne({
  state: {
    text:
      "Ticket: wireless headphones stopped charging. " +
      "Customer: Maya, plus plan. Plan benefits: free replacement for faulty items within 1 year. " +
      "Order: Wireless Headphones, $199, purchased about 2 months ago. " +
      `Message: ${message}`,
  },
  questions: {
    faulty: noul("Does the message describe a faulty product?"),
    covered: noul("Is the order item still covered by the customer plan benefits?"),
  },
});
console.log("--- ❌ string state ---");
show(asString);

// ✅ 同样的信息组织成对象
const asObject = await client.systemOne({
  state: {
    ticket: { subject: "Headphones stopped charging", message },
    customer: {
      name: "Maya",
      plan: "plus",
      planBenefits: ["Free replacement for faulty items within 1 year"],
    },
    order: { item: "Wireless Headphones", price: 199, purchasedAt: "about 2 months ago" },
  },
  questions: {
    faulty: noul("Does `ticket.message` describe a faulty product?"),
    covered: noul("Is `order.item` still covered by `customer.planBenefits`?"),
  },
});
console.log("--- ✅ object state ---");
show(asObject);
