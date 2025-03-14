"use client";

import { Badge } from "@/components/ui/badge";
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
import { Calendar, GitFork, Search, Star, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { loadMoreRepositories, searchRepositories } from "../_actions";

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
}

export default function RepoList({ initialRepos }: RepoListProps) {
  const [repositories, setRepositories] = useState<Repository[]>(initialRepos);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(50); 
  const limit = 50;
  
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [prevLanguage, setPrevLanguage] = useState("all"); 

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  
  useEffect(() => {
    if (debouncedSearchTerm || selectedLanguage !== "all") {
      
      if (selectedLanguage !== prevLanguage) {
        
        setPrevLanguage(selectedLanguage);
        performSearch(true); 
      } else {
        performSearch();
      }
    }
  }, [debouncedSearchTerm, selectedLanguage, prevLanguage]);

  
  async function performSearch(resetOffset = true) {
    setIsFiltering(true);
    setLoading(true);
    
    try {
      const searchOffset = resetOffset ? 0 : offset;
      const results = await searchRepositories({
        searchTerm: debouncedSearchTerm,
        language: selectedLanguage,
        offset: searchOffset,
        limit
      });
      
      if (resetOffset) {
        setRepositories(results as Repository[]);
        setOffset(limit);
      } else {
        setRepositories([...repositories, ...(results as Repository[])]);
        setOffset(searchOffset + limit);
      }
    } catch (error) {
      console.error("Error searching data:", error);
    } finally {
      setLoading(false);
    }
  }

  
  function resetFilters() {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedLanguage("all");
    setPrevLanguage("all"); 
    setIsFiltering(false);
    setRepositories(initialRepos);
    setOffset(50);
  }

  
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchTerm(value);
    
    
    if (value === '' && isFiltering) {
      resetFilters();
    }
  }

  
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      e.preventDefault();
      
      setDebouncedSearchTerm(searchTerm);
      performSearch();
    }
  }

  
  function handleSearch() {
    if (searchTerm.trim() !== '') {
      setDebouncedSearchTerm(searchTerm);
      performSearch();
    }
  }

  
  async function loadMore() {
    setLoading(true);
    try {
      if (isFiltering) {
        
        await performSearch(false);
      } else {
        
        const newRepos = await loadMoreRepositories(offset, limit);
        setRepositories([...repositories, ...(newRepos as Repository[])]);
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
  }

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
          {!loading && searchTerm.trim() !== '' && (
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
              {languages.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isFiltering || debouncedSearchTerm || selectedLanguage !== "all") && (
            <Button variant="outline" onClick={resetFilters} disabled={loading}>
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="grid" className="mb-8">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            Showing <strong>{repositories.length}</strong> repositories
            {isFiltering && " (filtered)"}
          </div>
        </div>
        
        <TabsContent value="grid" className="mt-6">
          {loading && repositories.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          ) : repositories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repositories.map((repo: Repository, index: number) => (
                <Card key={`${repo.full_name}-${index}`} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {repo.full_name}
                      </a>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 h-10">
                      {repo.description}
                    </CardDescription>
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
                      <span className="text-sm">{repo.language}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>{repo.stars?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      <span>-</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>-</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No matching repositories found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {loading && repositories.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          ) : repositories.length > 0 ? (
            <div className="space-y-4">
              {repositories.map((repo: Repository, index: number) => (
                <div
                  key={`${repo.full_name}-${index}`}
                  className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-lg border"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {repo.full_name}
                      </a>
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {repo.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              languageColors[repo.language] || "#ccc",
                          }}
                        />
                        {repo.language}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Star className="h-3 w-3" />
                        {repo.stars?.toLocaleString() || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    Update info not available
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No matching repositories found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {repositories.length > 0 && (
        (!isFiltering || repositories.length >= limit) ? (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={loadMore} 
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More Repositories"}
            </Button>
          </div>
        ) : null
      )}
    </>
  );
} 