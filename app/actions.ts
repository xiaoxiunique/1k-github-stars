"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ClickHouseClient, createClient } from "@clickhouse/client";
import { MongoClient, ObjectId } from "mongodb";

let client: ClickHouseClient;
let mongoClient: MongoClient;

// 获取MongoDB连接
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
  // 使用断言来确保TypeScript识别正确的类型
  return (data[0] as any)?.total || 0;
}

export async function loadMoreRepositories(offset: number, limit: number) {
  return getRepositories(offset, limit);
}

// 分类管理功能
export async function createCategory(data: { name: string; description: string }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { success: false, error: "未登录" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    // 创建新分类
    const category = {
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id,
      repos: [] // 初始为空数组
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
    console.error("创建分类出错:", error);
    return { success: false, error: "创建分类失败" };
  }
}

export async function getUserCategories() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { categories: [], error: "未登录" };
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
    console.error("获取分类出错:", error);
    return { categories: [], error: "获取分类失败" };
  }
}

export async function deleteCategory(categoryId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { success: false, error: "未登录" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    // 确保用户只能删除自己的分类
    const result = await db.collection("categories").deleteOne({
      _id: new ObjectId(categoryId),
      userId: session.user.id
    });
    
    if (result.deletedCount === 0) {
      return { success: false, error: "分类不存在或无权删除" };
    }
    
    return { success: true };
  } catch (error) {
    console.error("删除分类出错:", error);
    return { success: false, error: "删除分类失败" };
  }
}

export async function getCategoryById(categoryId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { category: null, error: "未登录" };
  }
  
  try {
    const mongo = await getMongoClient();
    const db = mongo.db();
    
    const category = await db.collection("categories").findOne({
      _id: new ObjectId(categoryId)
    });
    
    if (!category) {
      return { category: null, error: "分类不存在" };
    }
    
    // 如果不是自己的分类，检查是否为公开分类
    if (category.userId !== session.user.id && !category.isPublic) {
      return { category: null, error: "无权访问此分类" };
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
    console.error("获取分类详情出错:", error);
    return { category: null, error: "获取分类详情失败" };
  }
}

// 获取用户已star的GitHub仓库
export async function getUserStarredRepos(page = 1, limit = 100) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { repos: [], error: "未登录", total: 0, hasMore: false };
  }
  
  try {
    // 确保我们有访问令牌
    if (!session.accessToken) {
      return { repos: [], error: "没有可用的访问令牌", total: 0, hasMore: false };
    }
    
    const response = await fetch(`https://api.github.com/user/starred?per_page=${limit}&page=${page}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API错误: ${response.status}`);
    }
    
    const starredRepos = await response.json();
    const linkHeader = response.headers.get('Link');
    const hasMore = linkHeader ? linkHeader.includes('rel="next"') : false;
    
    // 获取总数
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
    
    // 将GitHub API返回的数据转换为我们应用中使用的格式
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
    console.error("获取星标仓库时出错:", error);
    return { repos: [], error: "获取已Star的仓库失败", total: 0, hasMore: false };
  }
} 