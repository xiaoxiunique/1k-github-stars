"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

interface AISearchBarProps {
  onSearch: (query: string) => Promise<void>;
  isLoading: boolean;
}

export default function AISearchBar({ onSearch, isLoading }: AISearchBarProps) {
  const [aiQuery, setAiQuery] = useState("");

  const handleSearch = async () => {
    if (aiQuery.trim() !== "") {
      await onSearch(aiQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && aiQuery.trim() !== "") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/40 p-4 rounded-lg mb-6">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span>AI Search</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Search repositories with natural language, e.g.: "Find Rust repositories updated within a week"
        </p>
        <div className="relative flex gap-2">
          <Input
            placeholder="Describe the repositories you're looking for in natural language..."
            className="flex-1"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSearch}
            disabled={isLoading || aiQuery.trim() === ""}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>
      </div>
    </div>
  );
} 