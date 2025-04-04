"use client";

import { useEffect, useState, useCallback } from "react";
import { getUserStarredRepos } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Calendar, GitFork, Loader2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";

interface Repository {
  name: string;
  user_id: number;
  user_name: string;
  description: string;
  full_name: string;
  topics: string[];
  url: string;
  stars: number;
  language: string;
  forks: number;
  pushed_at: string;
}

const languageColors: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#2b7489",
  "C++": "#f34b7d",
  Dart: "#00B4AB",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  PHP: "#4F5D95",
  Ruby: "#701516",
  C: "#555555",
};

interface StarredReposState {
  repos: Repository[];
  currentPage: number;
  totalRepos: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export default function StarredRepos() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<StarredReposState>({
    repos: [],
    currentPage: 1,
    totalRepos: 0,
    hasMore: false,
    loading: false,
    error: null,
    initialized: false
  });

  const { repos, currentPage, totalRepos, hasMore, loading, error, initialized } = state;

  // 使用useCallback缓存fetchStarredRepos函数，避免重复创建
  const fetchStarredRepos = useCallback(async (page: number = 1, force: boolean = false) => {
    // 如果已经初始化且不是强制刷新，则直接返回
    if (initialized && !force && page === currentPage) {
      return;
    }

    if (status !== "authenticated" || !session) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await getUserStarredRepos(page);
      if (response.error) {
        setState(prev => ({ 
          ...prev, 
          error: response.error, 
          loading: false,
          initialized: true
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          repos: response.repos, 
          totalRepos: response.total,
          hasMore: response.hasMore,
          currentPage: page,
          error: null, 
          loading: false,
          initialized: true
        }));
      }
    } catch (err) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        error: "获取已Star的仓库失败", 
        loading: false,
        initialized: true
      }));
    }
  }, [status, session, currentPage, initialized]);

  // 加载下一页
  const loadNextPage = () => {
    if (hasMore && !loading) {
      fetchStarredRepos(currentPage + 1);
    }
  };

  // 加载上一页
  const loadPrevPage = () => {
    if (currentPage > 1 && !loading) {
      fetchStarredRepos(currentPage - 1);
    }
  };

  // 只在组件首次加载和用户登录状态变化时获取数据
  useEffect(() => {
    if (status === "authenticated" && !initialized) {
      fetchStarredRepos(1);
    } else if (status !== "loading" && !initialized) {
      setState(prev => ({ ...prev, initialized: true, loading: false }));
    }
  }, [status, fetchStarredRepos, initialized]);

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="mb-4 text-muted-foreground">请登录以查看您已 Star 的项目</p>
        <Button onClick={() => signIn("github")}>使用GitHub登录</Button>
      </div>
    );
  }

  if (!initialized && loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">正在加载您已 Star 的项目...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive mb-4">出错了: {error}</p>
        {error === "没有可用的访问令牌" && (
          <div className="mb-4">
            <p className="mb-2 text-muted-foreground">GitHub需要特殊的访问权限来获取您已Star的项目</p>
            <Button onClick={() => signIn("github", { callbackUrl: window.location.href })}>重新授权GitHub</Button>
          </div>
        )}
        <Button variant="outline" onClick={() => fetchStarredRepos(1, true)}>重试</Button>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">您尚未 Star 任何项目</p>
        <a 
          href="https://github.com/explore" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 text-primary hover:underline"
        >
          到GitHub探索更多项目
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repos.map((repo, index) => (
          <Card
            key={`${repo.full_name}-${index}`}
            className="overflow-hidden cursor-pointer"
          >
            <CardHeader className="pb-3 flex flex-row items-center gap-3">
              <Avatar
                className="w-10 h-10"
                onClick={() => {
                  window.open(
                    `https://github.com/${repo.user_name}`,
                    "_blank"
                  );
                }}
              >
                <AvatarImage
                  src={`https://github.com/${repo.user_name}.png?size=80`}
                />
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {repo.name}
                  </a>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {repo.user_name}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      languageColors[repo.language] || "#ccc",
                  }}
                />
                <span className="text-sm">
                  {repo.language || "Other"}
                </span>
              </div>
              <CardDescription className="text-sm text-muted-foreground line-clamp-2 min-h-[3em]">
                {repo.description || "No description available"}
              </CardDescription>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>{repo.stars?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitFork className="h-4 w-4" />
                <span>{repo.forks?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{repo.pushed_at?.slice(0, 10) || "Unknown"}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 分页控制 */}
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-muted-foreground">
          总共 <span className="font-medium">{totalRepos}</span> 个已 Star 的项目，
          当前第 <span className="font-medium">{currentPage}</span> 页
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadPrevPage}
            disabled={currentPage <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一页
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadNextPage}
            disabled={!hasMore || loading}
          >
            下一页
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">加载中...</span>
        </div>
      )}
    </div>
  );
} 