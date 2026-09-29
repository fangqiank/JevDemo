/**
 * 场景 2.2：noul 回答"是否"，score 回答"程度"
 * ❌ 用 noul 的概率衡量程度：0.19 / 0.93 / 0.99 —— 后两条都是"强 yes"，
 *    分不出"失望"和"暴怒"。0.5 只是"是/否各半"，不是"中等愤怒"。
 * ✅ score + 描述每个等级的含义 → 0 / 1 / 2，代码可用来排序比较
 * ❌ 偷懒的等级（low/medium/high）：数值接近但中间那条 confidence 更低
 *
 * 结论：问真假用 noul；问程度用 score，并具体描述每个等级代表什么。
 */
import { noul, score } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

const messages = [
  "Hi, can you help me with my headphones?",
  "I'm disappointed that another pair has broken.",
  "This is unacceptable! I'm angry and I will cancel my plan!",
];

for (const message of messages) {
  const state = { ticket: { message } };

  console.log(`\n"${message}"`);

  console.log("--- ❌ noul probability as degree ---");
  show(await client.systemOne({ state, questions: { frustrated: noul("Is the customer frustrated in the message?") } }));

  console.log("--- ✅ score with described levels ---");
  show(
    await client.systemOne({
      state,
      questions: {
        frustration: score("How frustrated is the customer in this message?", [
          "Not frustrated",
          "Disappointed or annoyed",
          "Angry, making complaints",
        ]),
      },
    }),
  );

  console.log("--- ❌ lazy levels (low/medium/high) ---");
  show(
    await client.systemOne({
      state,
      questions: {
        frustration: score("How frustrated is the customer in this message?", [
          "Low frustration",
          "Medium frustration",
          "High frustration",
        ]),
      },
    }),
  );
}
