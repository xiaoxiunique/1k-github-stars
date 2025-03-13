import { createClient } from "@clickhouse/client";

const parsedUrl = URL.parse(process.env.CLICKHOUSE_URL!);
export const db = createClient({
  url: `https://${parsedUrl?.hostname}`,
  username: parsedUrl?.username,
  password: parsedUrl?.password,
});
