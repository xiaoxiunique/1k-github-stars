"use server";

import { db } from "./db";

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
