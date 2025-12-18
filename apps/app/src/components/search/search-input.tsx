"use client";

import { Input } from "@nebula/ui/input";
import { Icons } from "@nebula/ui/icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="relative">
      <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search posts, users, or #hashtags..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10"
      />
    </div>
  );
}
