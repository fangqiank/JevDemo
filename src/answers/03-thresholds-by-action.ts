/**
 * 场景 3.3：不同动作设不同阈值（confidence-gated routing）
 * 同一个答案可以做两件事：给客服"建议回复"（错了改一下就行，0.5 就够）
 * 和"自动退款"（错了要真金白银，0.95 才行）。
 *
 * 视频实测：直接要钱 → confidence 1.0，建议 + 自动退款都通过；
 * "除非能很快换新就退钱" → confidence ~0.93：建议回复 OK，自动退款不通过，人工确认偏好。
 *
 * 结论：阈值由"做错的代价"决定，不是统一一个数。
 */
import { choice } from "@typesafe-ai/sdk";
import { client } from "../lib/client";
import { show } from "../lib/show";

async function handle(message: string): Promise<void> {
  const r = await client.systemOne({
    state: { ticket: { message } },
    questions: {
      intent: choice("What does the customer want?", {
        refund: "Money back to their card",
        replacement: "A new or repaired unit",
        information: "Questions about options, policy or status",
        other: "Something else",
      }),
    },
  });
  show(r);
  const { choice: intent, confidence } = r.answers.intent;

  // 建议回复：低阈值 0.5
  if (confidence >= 0.5) {
    console.log(`  suggest reply (>=0.5): draft a ${intent} reply for the agent`);
  } else {
    console.log("  suggest reply (>=0.5): no — too uncertain to suggest");
  }

  // 自动退款：高阈值 0.95
  if (confidence >= 0.95 && intent === "refund") {
    console.log("  auto refund (>=0.95): ✅ issued");
  } else {
    console.log("  auto refund (>=0.95): hold for human review");
  }
}

for (const m of [
  "I would like my money back please.",
  "I would like my money back unless a replacement can ship quickly.",
]) {
  console.log(`\n"${m}"`);
  await handle(m);
}
