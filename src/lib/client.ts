import { TypeSafeClient } from "@typesafe-ai/sdk";

// 从环境变量 TYPESAFE_API_KEY 读取密钥（.env 已配置，由 tsx --env-file 加载）
export const client = new TypeSafeClient();
