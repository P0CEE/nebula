"use client";

import { useState, useEffect } from "react";
import { SearchInput } from "./search-input";
import { SearchTabs, type SearchTab } from "./search-tabs";
import { SearchResults } from "./search-results";

export function SearchContainer() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="p-4 space-y-4">
      <SearchInput value={query} onChange={setQuery} />

      {debouncedQuery && (
        <>
          <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <SearchResults query={debouncedQuery} tab={activeTab} />
        </>
      )}

      {!debouncedQuery && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Search for posts, users, or hashtags
          </p>
        </div>
      )}
    </div>
  );
}
