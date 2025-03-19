import { createClient } from "@clickhouse/client";

const parsedUrl = URL.parse(process.env.CLICKHOUSE_URL!);
export const db = createClient({
  url: `https://${parsedUrl?.hostname}`,
  username: parsedUrl?.username,
  password: parsedUrl?.password,
});

export async function getDDL() {
  const result = await db.query({
    query: "show create table repos_new",
    format: "JSONEachRow",
  });

  const data = await result.json();
  console.log("🚀 ~ getDDL ~ data:", data)

  // @ts-ignore
  return data[0].statement;
}
