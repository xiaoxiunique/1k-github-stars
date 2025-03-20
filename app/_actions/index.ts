"use server";

import { mongoClient } from "./db";

export async function getTotal() {
  try {
    await mongoClient.connect();
    const database = mongoClient.db("1kgithub");
    const collection = database.collection("repos");
    
    const count = await collection.countDocuments();
    return count;
  } catch (error) {
    console.error("Error getting total count:", error);
    return 0;
  }
}

export async function getRepositories(offset = 0, limit = 50) {
  try {
    await mongoClient.connect();
    const database = mongoClient.db("1kgithub");
    const collection = database.collection("repos");
    
    const repos = await collection
      .find({})
      .sort({ stars: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return repos;
  } catch (error) {
    console.error("Error getting repositories:", error);
    return [];
  }
}

export async function loadMoreRepositories(offset = 0, limit = 50) {
  return getRepositories(offset, limit);
}

export async function searchRepositories({
  searchTerm = "",
  language = "all",
  offset = 0,
  limit = 50,
}) {
  try {
    await mongoClient.connect();
    const database = mongoClient.db("1kgithub");
    const collection = database.collection("repos");
    
    const query: Record<string, any> = {};
    
    if (searchTerm && searchTerm.trim() !== "") {
      query.description = { $regex: searchTerm, $options: "i" };
    }
    
    if (language && language !== "all") {
      query.language = language;
    }
    
    console.log("Executing query:", JSON.stringify(query));
    
    const repos = await collection
      .find(query)
      .sort({ stars: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return JSON.parse(JSON.stringify(repos));
  } catch (error) {
    console.error("Error searching repositories:", error);
    return [];
  }
}
