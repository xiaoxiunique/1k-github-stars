import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";

export async function generateQueryConditions(ddl: string, query: string) {
  const result = await generateObject({
    model: deepseek("deepseek-coder"),
    schema: z.object({
      success: z.boolean().describe("Whether SQL query generation was successful. Returns false if user input is invalid"),
      sqlQuery: z.string().describe("The generated SQL query"),
      conditions: z.array(
        z.object({
          field: z.string().describe("Database field name"),
          operator: z.string().describe("Operator like =, >, <, LIKE etc"),
          value: z.string().describe("Query value")
        })
      ).describe("Structured representation of query conditions"),
    }),
    prompt: `
      Convert the following natural language query to SQL query.
      Analyze user intent, extract key conditions, and generate valid SQL query.
      Also provide structured representation of query conditions for program processing.
      
      Natural language query: ${query}
      Database schema: ${ddl}
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