import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";

export async function generateQueryConditions(ddl: string, query: string) {
  const result = await generateObject({
    model: deepseek("deepseek-coder"),
    schema: z.object({
      success: z.boolean().describe("Whether SQL query generation was successful. Returns false if user input is invalid"),
      sqlQuery: z.string().describe("The generated SQL query"),
    }),
    prompt: `
      Convert the following natural language query to SQL query.
      Analyze user intent, extract key conditions, and generate valid SQL query.
      Also provide structured representation of query conditions for program processing.
      
      Natural language query: ${query}
      Database schema: CREATE TABLE default.repos_new
      (
        name String,
        user_id Int64,
        user_name String,
        description String,
        full_name String,
        topics Array(String),
        url String,
        stars Int64,
        language String,
        update_at DateTime,
        created_at DateTime,
        forks Int64,
        watchers Int64,
        size Int64,
        open_issues Int64,
        license String,
        pushed_at DateTime
      )
      ENGINE = SharedReplacingMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
      PRIMARY KEY name
      ORDER BY name
      SETTINGS index_granularity = 8192
      Database: clickhouse

      ## Notes
      1. Do not generate any explanations or comments
      2. Return false if user input is invalid
      3. Only generate SQL queries related to user input, do not generate any unrelated SQL queries
      4.Since it is using ClickHouse, all need to use the final syntax
        select from table final where condition
    `,
  });
  
  return result;
}