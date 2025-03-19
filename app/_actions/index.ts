"use server";

import { db, getDDL } from "./db";
import { generateQueryConditions } from "./deepseek";

export async function getTotal() {
  const result = await db.query({
    query: "select count(1) as count from repos_new final",
    format: "JSONEachRow",
  });

  const data = await result.json();

  // @ts-ignore
  return data?.[0]?.count ?? 0;
}

export async function getRepositories(offset = 0, limit = 50) {
  const result = await db.query({
    query: `select * from repos_new final order by stars desc limit ${limit} offset ${offset}`,
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function loadMoreRepositories(offset = 0, limit = 50) {
  const result = await db.query({
    query: `select * from repos_new final order by stars desc limit ${limit} offset ${offset}`,
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function searchRepositories({
  searchTerm = "",
  language = "all",
  offset = 0,
  limit = 50,
}) {
  let whereConditions = [];
  let queryParams = [];

  if (searchTerm && searchTerm.trim() !== "") {
    whereConditions.push("description ILIKE ?");
    queryParams.push(`%${searchTerm}%`);
  }

  if (language && language !== "all") {
    whereConditions.push("language ILIKE ?");
    queryParams.push(language);
  }

  let query = "SELECT * FROM repos_new final";

  if (whereConditions.length > 0) {
    query += " WHERE " + whereConditions.join(" AND ");
  }

  query += " ORDER BY stars DESC";
  query += ` LIMIT ${limit} OFFSET ${offset}`;

  queryParams.forEach((param) => {
    query = query.replace("?", `'${param}'`);
  });

  console.log("Executing query:", query);

  const result = await db.query({
    query,
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function aiSearchRepositories({
  query = "",
  offset = 0,
  limit = 50,
}) {
  if (!query || query.trim() === "") {
    return await getRepositories(offset, limit);
  }

  try {
    // Get database table structure
    const ddl = await getDDL();
    
    // Use AI to generate query conditions
    const result = await generateQueryConditions(ddl, query);
    const aiResponse = result.object as unknown as {
      success: boolean;
      sqlQuery: string;
      conditions: Array<{
        field: string;
        operator: string;
        value: string;
      }>;
    };
    
    if (!aiResponse.success) {
      console.log("AI query failed, returning default results");
      return await getRepositories(offset, limit);
    }
    
    // Execute AI-generated SQL query
    const finalQuery = `${aiResponse.sqlQuery} order by stars desc LIMIT ${limit} OFFSET ${offset}`;
    console.log("🚀 ~ finalQuery:", finalQuery)

    const dbResult = await db.query({
      query: finalQuery,
      format: "JSONEachRow",
    });
    
    return await dbResult.json();
  } catch (error) {
    console.error("AI search error:", error);
    // Return default query results when error occurs
    return await getRepositories(offset, limit);
  }
}
