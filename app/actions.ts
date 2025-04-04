"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { MongoClient, ObjectId } from "mongodb";

let client: ClickHouseClient;
let mongoClient: MongoClient;

// Get MongoDB connection
async function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URL as string);
    await mongoClient.connect();
  }
  return mongoClient;
}

function getClickhouseClient() {
  if (!client) {
    client = createClient({
      url: process.env.CLICKHOUSE_URL as string,
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0,
      },
    });
  }
  return client;
}

export async function getRepositories(offset = 0, limit = 50) {
  const clickhouse = getClickhouseClient();
  const result = await clickhouse.query({
    query: `
      SELECT
        name,
        user_id,
        user_name,
        description,
        full_name,
        topics,
        url,
        stars,
        language,
        forks,
        formatDateTime(pushed_at, '%Y-%m-%d %H:%M:%S') as pushed_at
      FROM github_repos
      ORDER BY stars DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    format: "JSONEachRow",
  });

  const data = await result.json();
  return data;
}

export async function searchRepositories({
  searchTerm,
  language,
  offset = 0,
  limit = 50,
}: {
  searchTerm: string;
  language: string;
  offset: number;
  limit: number;
}) {
  const clickhouse = getClickhouseClient();

  let query = `
    SELECT
      name,
      user_id,
      user_name,
      description,
      full_name,
      topics,
      url,
      stars,
      language,
      forks,
      formatDateTime(pushed_at, '%Y-%m-%d %H:%M:%S') as pushed_at
    FROM github_repos
    WHERE 1=1
  `;

  if (searchTerm) {
    query += `
      AND (
        name ILIKE '%${searchTerm}%'
        OR description ILIKE '%${searchTerm}%'
        OR full_name ILIKE '%${searchTerm}%'
      )
    `;
  }

  if (language && language !== "all") {
    query += ` AND language = '${language}'`;
  }

  query += `
    ORDER BY stars DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const result = await clickhouse.query({
    query,
    format: "JSONEachRow",
  });

  const data = await result.json();
  return data;
}

export async function getTotal() {
  const clickhouse = getClickhouseClient();
  const result = await clickhouse.query({
    query: "SELECT COUNT(*) as total FROM github_repos",
    format: "JSONEachRow",
  });

  const data = await result.json();
  // Use assertion to ensure TypeScript recognizes the correct type
  return (data[0] as any)?.total || 0;
}

export async function loadMoreRepositories(offset: number, limit: number) {
  return getRepositories(offset, limit);
}

// Category management functions
export async function createCategory(data: { name: string; description: string }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { success: false, error: "Not logged in" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    // Create new category
    const category = {
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id,
      repos: [] // Initially an empty array
    };
    
    const result = await db.collection("categories").insertOne(category);
    
    return { 
      success: true, 
      category: {
        id: result.insertedId.toString(),
        name: category.name,
        description: category.description,
        createdAt: category.createdAt.toISOString(),
        userId: category.userId
      } 
    };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function getUserCategories() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { categories: [], error: "Not logged in" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    const categoriesCursor = db.collection("categories").find({
      userId: session.user.id
    }).sort({ createdAt: -1 });
    
    const categories = await categoriesCursor.toArray();
    
    return { 
      categories: categories.map(cat => ({
        id: cat._id.toString(),
        name: cat.name,
        description: cat.description,
        createdAt: cat.createdAt.toISOString(),
        userId: cat.userId
      })),
      error: null 
    };
  } catch (error) {
    console.error("Error getting categories:", error);
    return { categories: [], error: "Failed to get categories" };
  }
}

export async function deleteCategory(categoryId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { success: false, error: "Not logged in" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    // Ensure users can only delete their own categories
    const result = await db.collection("categories").deleteOne({
      _id: new ObjectId(categoryId),
      userId: session.user.id
    });
    
    if (result.deletedCount === 0) {
      return { success: false, error: "Category doesn't exist or you don't have permission to delete it" };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

export async function getCategoryById(categoryId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { category: null, error: "Not logged in" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    const category = await db.collection("categories").findOne({
      _id: new ObjectId(categoryId)
    });
    
    if (!category) {
      return { category: null, error: "Category doesn't exist" };
    }
    
    // If it's not your own category, check if it's a public category
    if (category.userId !== session.user.id && !category.isPublic) {
      return { category: null, error: "You don't have permission to access this category" };
    }
    
    return { 
      category: {
        id: category._id.toString(),
        name: category.name,
        description: category.description,
        createdAt: category.createdAt.toISOString(),
        userId: category.userId,
        repos: category.repos || []
      },
      error: null 
    };
  } catch (error) {
    console.error("Error getting category details:", error);
    return { category: null, error: "Failed to get category details" };
  }
}

// Get user's starred GitHub repositories
export async function getUserStarredRepos(page = 1, limit = 100) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { repos: [], error: "Not logged in", total: 0, hasMore: false };
  }
  
  try {
    // Ensure we have an access token
    if (!session.accessToken) {
      return { repos: [], error: "No available access token", total: 0, hasMore: false };
    }
    
    const response = await fetch(`https://api.github.com/user/starred?per_page=${limit}&page=${page}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const starredRepos = await response.json();
    const linkHeader = response.headers.get('Link');
    const hasMore = linkHeader ? linkHeader.includes('rel="next"') : false;
    
    // Get total
    let total = 0;
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      total = userData.public_repos || 0;
    }
    
    // Convert GitHub API returned data to format we use in our app
    const formattedRepos = starredRepos.map((repo: any) => ({
      name: repo.name,
      user_id: repo.owner.id,
      user_name: repo.owner.login,
      description: repo.description,
      full_name: repo.full_name,
      topics: repo.topics || [],
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language,
      forks: repo.forks_count,
      pushed_at: repo.pushed_at,
    }));
    
    return { 
      repos: formattedRepos, 
      error: null, 
      total, 
      hasMore,
      currentPage: page
    };
  } catch (error) {
    console.error("Error getting starred repositories:", error);
    return { repos: [], error: "Failed to get starred repositories", total: 0, hasMore: false };
  }
} 