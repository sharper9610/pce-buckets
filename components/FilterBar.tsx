"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Filter {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: Filter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function FilterBar({ filters, values, onChange }: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
      {filters.map((filter) => (
        <div key={filter.key} className="space-y-2">
          <Label htmlFor={filter.key}>{filter.label}</Label>
          {filter.type === "text" ? (
            <Input
              id={filter.key}
              placeholder={filter.placeholder || filter.label}
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
            />
          ) : (
            <Select
              value={values[filter.key] || "all"}
              onValueChange={(value) => onChange(filter.key, value)}
            >
              <SelectTrigger id={filter.key}>
                <SelectValue placeholder={filter.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  );
}
