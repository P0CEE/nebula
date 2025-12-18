"use client";

import { Button } from "@nebula/ui/button";

export type SearchTab = "all" | "posts" | "users" | "hashtags";

type Props = {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
};

const tabs: { id: SearchTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "posts", label: "Posts" },
  { id: "users", label: "Users" },
  { id: "hashtags", label: "Hashtags" },
];

export function SearchTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex gap-2 border-b border-border pb-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
