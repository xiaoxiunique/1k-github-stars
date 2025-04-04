"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Calendar, GitFork, Loader2, Search, Star, ArrowLeft, Plus } from "lucide-react";

interface CategoryDetailProps {
  category: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    userId: string;
    repos: any[];
  };
}

// Same color mapping as in RepoList
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

export function CategoryDetail({ category }: CategoryDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("repos");
  
  // Check if repository information is passed in URL parameters
  const repoName = searchParams.get("repo");
  const repoOwner = searchParams.get("owner");
  
  useEffect(() => {
    // If URL contains repository information, switch to add tab
    if (repoName && repoOwner) {
      setActiveTab("add");
      // Pre-fill search box
      setSearchQuery(`${repoOwner}/${repoName}`);
    }
  }, [repoName, repoOwner]);

  // Temporarily assume the category's repositories are empty, can implement add functionality later
  const repos = category.repos || [];

  // Return to user profile
  const handleBackToProfile = () => {
    router.push("/user");
  };

  // Search functionality can be implemented here
  const handleSearch = () => {
    setLoading(true);
    // TODO: Implement search matching project functionality
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={handleBackToProfile}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{category.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Category Info</CardTitle>
              <CardDescription>
                Created on {new Date(category.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {category.description || "No description"}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("add")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Main content area */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="repos">Added Projects</TabsTrigger>
              <TabsTrigger value="add">Add New Project</TabsTrigger>
            </TabsList>

            <TabsContent value="repos">
              {repos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.map((repo, index) => (
                    <Card key={index} className="overflow-hidden">
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
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">No Projects Added</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    You can add projects related to "{category.name}" to this category
                  </p>
                  <Button className="mt-6" onClick={() => setActiveTab("add")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Project
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="add">
              <Card>
                <CardHeader>
                  <CardTitle>Add Project to {category.name}</CardTitle>
                  <CardDescription>
                    Search and add GitHub projects related to this category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter repository name or project description..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    {loading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Project Theme Description</h3>
                    <Textarea
                      placeholder="Describe the type of projects you want to collect, such as 'Latest AI self-driving open source projects' or 'High-performance Rust Web frameworks'..."
                      className="min-h-[100px]"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      The system will automatically analyze and match relevant open source projects based on your description
                    </p>
                  </div>

                  <Button 
                    onClick={handleSearch} 
                    disabled={loading || !searchQuery.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : "Search Matching Projects"}
                  </Button>
                </CardContent>
              </Card>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Search Results</h3>
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">
                    Search for projects on GitHub related to your description
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 