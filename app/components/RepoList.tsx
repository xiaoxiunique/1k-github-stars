"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  GitFork,
  Loader2,
  Search,
  Star,
  FolderPlus,
  ListFilter,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  loadMoreRepositories,
  searchRepositories,
  getUserCategories,
  createCategory,
} from "../actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import StarredRepos from "./StarredRepos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const languages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "C",
  "Dart",
];

interface RepoListProps {
  initialRepos: Repository[];
  total: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  userId: string;
}

export default function RepoList({ initialRepos, total }: RepoListProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial search term and language from URL
  const initialSearchTerm = searchParams.get("search") || "";
  const initialLanguage = searchParams.get("language") || "all";
  const initialTab = searchParams.get("tab") || "explore";

  const [repositories, setRepositories] = useState<Repository[]>(initialRepos);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(50);
  const [activeTab, setActiveTab] = useState(initialTab);
  const limit = 50;

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [isFiltering, setIsFiltering] = useState(
    initialSearchTerm !== "" || initialLanguage !== "all"
  );
  const [prevLanguage, setPrevLanguage] = useState(initialLanguage);

  // Category-related states
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // 添加到分类相关状态
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [addToCategoryOpen, setAddToCategoryOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // At initial load, perform search if URL has search parameters
  useEffect(() => {
    if (initialSearchTerm || initialLanguage !== "all") {
      performSearch(true);
    }
  }, []);

  // Fetch user categories
  useEffect(() => {
    if (activeTab === "categories" && status === "authenticated") {
      fetchCategories();
    }
  }, [activeTab, status]);

  // Get user's category list
  const fetchCategories = async () => {
    if (status !== "authenticated") return;

    setCategoriesLoading(true);
    try {
      const response = await getUserCategories();
      if (response.categories) {
        setCategories(response.categories);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Handle creating new category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCategoryError("");

    try {
      if (!formData.name.trim()) {
        setCategoryError("Category name cannot be empty");
        return;
      }

      const result = await createCategory({
        name: formData.name,
        description: formData.description,
      });

      if (result.success) {
        // Add new category to the list
        if (result.category) {
          setCategories((prev) => [...prev, result.category as Category]);
        }
        // Reset form and close dialog
        setFormData({ name: "", description: "" });
        setIsOpen(false);
      } else {
        setCategoryError(result.error || "Failed to create category");
      }
    } catch (err) {
      console.error("Error creating category:", err);
      setCategoryError("An error occurred while creating the category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 查看分类详情
  const viewCategory = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  // 更新 URL 的函数
  const updateUrl = (search: string, language: string, tab: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (language && language !== "all") params.set("language", language);
    if (tab !== "explore") params.set("tab", tab);

    const newUrl = `${window.location.pathname}${
      params.toString() ? "?" + params.toString() : ""
    }`;
    router.push(newUrl, { scroll: false });
  };

  // 选项卡改变处理函数
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    updateUrl(searchTerm, selectedLanguage, value);
  };

  async function performSearch(resetOffset = true) {
    setIsFiltering(true);
    setLoading(true);

    try {
      const searchOffset = resetOffset ? 0 : offset;
      const results = await searchRepositories({
        searchTerm: searchTerm,
        language: selectedLanguage,
        offset: searchOffset,
        limit,
      });

      // 更新 URL
      updateUrl(searchTerm, selectedLanguage, activeTab);

      if (resetOffset) {
        setRepositories(results as unknown as Repository[]);
        setOffset(limit);
      } else {
        setRepositories([
          ...repositories,
          ...(results as unknown as Repository[]),
        ]);
        setOffset(searchOffset + limit);
      }
    } catch (error) {
      console.error("Error searching data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchTerm(value);

    if (value === "" && isFiltering) {
      resetFilters();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      e.preventDefault();
      performSearch(true);
    }
  }

  function handleSearch() {
    if (searchTerm.trim() !== "") {
      performSearch(true);
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setSelectedLanguage("all");
    setPrevLanguage("all");
    setIsFiltering(false);
    setRepositories(initialRepos);
    setOffset(50);

    // 清除 URL 参数，但保留标签页
    updateUrl("", "all", activeTab);
  }

  async function loadMore() {
    setLoading(true);
    try {
      if (isFiltering) {
        await performSearch(false);
      } else {
        const newRepos = await loadMoreRepositories(offset, limit);
        setRepositories([
          ...repositories,
          ...(newRepos as unknown as Repository[]),
        ]);
        setOffset(offset + limit);
      }
    } catch (error) {
      console.error("Error loading more data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLanguageChange(value: string) {
    setSelectedLanguage(value);
    // 语言改变时更新 URL 并执行搜索
    updateUrl(searchTerm, value, activeTab);
    setPrevLanguage(value);
    performSearch(true);
  }

  // 添加到分类的处理函数
  const handleAddToCategory = () => {
    if (!selectedRepo || !selectedCategoryId) return;

    // 重定向到分类详情页，并传递仓库信息
    router.push(
      `/category/${selectedCategoryId}?repo=${selectedRepo.name}&owner=${selectedRepo.user_name}`
    );
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repository descriptions..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && searchTerm.trim() !== "" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={handleSearch}
              >
                <Search className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedLanguage}
            onValueChange={handleLanguageChange}
            disabled={loading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Programming Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isFiltering || selectedLanguage !== "all") && (
            <Button variant="outline" onClick={resetFilters} disabled={loading}>
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="explore">Explore Projects</TabsTrigger>
            <TabsTrigger
              value="starred"
              disabled={status === "unauthenticated"}
            >
              Starred Projects
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              disabled={status === "unauthenticated"}
            >
              My Categories
            </TabsTrigger>
          </TabsList>
          {activeTab === "explore" && (
            <div className="text-sm text-muted-foreground">
              Showing <strong>{repositories.length}</strong> of{" "}
              <strong>{total.toLocaleString()}</strong> repositories
              {isFiltering && " (filtered)"}
            </div>
          )}

          {activeTab === "categories" && status === "authenticated" && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCategory}>
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>
                      Create a new category to organize and track GitHub
                      projects you're interested in
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g. AI Projects, Utility Libraries, etc."
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Category Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the theme and collection goals of this category..."
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {categoryError && (
                      <p className="text-sm text-destructive">
                        {categoryError}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Category"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="explore" className="mt-6">
          {loading && repositories.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          ) : repositories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repositories.map((repo: Repository, index: number) => (
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
                      <span>{repo.pushed_at.slice(0, 10)}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No matching repositories found
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="starred" className="mt-6">
          <StarredRepos />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          {status === "unauthenticated" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                Please login to view your project categories
              </p>
              <Button onClick={() => signIn("github")}>
                Login with GitHub
              </Button>
            </div>
          ) : categoriesLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading categories...
              </span>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Created on{" "}
                      {new Date(category.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[3em]">
                      {category.description || "No description"}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => viewCategory(category.id)}
                    >
                      <ListFilter className="mr-2 h-4 w-4" />
                      View Projects
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <ListFilter className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-medium">No Categories Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Create your first category to start collecting and organizing
                GitHub projects you're interested in
              </p>
              <Button className="mt-6" onClick={() => setIsOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {activeTab === "explore" &&
        repositories.length > 0 &&
        (!isFiltering || repositories.length >= limit ? (
          <div className="flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? "Loading..." : "Load More Repositories"}
            </Button>
          </div>
        ) : null)}
    </>
  );
}
