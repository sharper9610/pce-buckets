"use client";

import { useEffect, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { Table } from "@/components/Table";
import { JsonDrawer } from "@/components/JsonDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LibraryItem {
  sku: string;
  title: string;
  publisher?: string;
  stock?: {
    free: number;
  };
  promo?: {
    status?: string | null;
  };
  discountComparison?: string | null;
  risk?: "low" | "high" | null;
  cycleDays?: number;
  raw?: any;
}

const ITEMS_PER_PAGE = 100;

export default function LibraryViewPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    publisher: "all",
    inventory: "all",
    promo: "all",
    discount: "all",
    risk: "all",
  });

  const [sortBy, setSortBy] = useState<"none" | "stock-high" | "stock-low">("none");

  useEffect(() => {
    loadPublishers();
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [currentPage, filters]);

  async function loadPublishers() {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data } = await supabase
        .from("library_items")
        .select("json->publisher_name")
        .not("json->publisher_name", "is", null);

      if (data) {
        const uniquePublishers = Array.from(
          new Set(
            data
              .map((item: any) => item.json?.publisher_name)
              .filter(Boolean)
          )
        ) as string[];
        setPublishers(uniquePublishers.sort());
      }
    } catch (error) {
      console.error("Failed to load publishers:", error);
    }
  }

  async function loadLibrary() {
    setLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      let query = supabase
        .from("library_items")
        .select("sku, json", { count: 'exact' });

      if (filters.search) {
        query = query.or(`sku.ilike.%${filters.search}%,json->>title.ilike.%${filters.search}%`);
      }

      if (filters.publisher !== "all") {
        query = query.eq("json->>publisher_name", filters.publisher);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      setTotalCount(count || 0);

        const libraryData = data.map((item: any) => {
          const upcomingDiscount = item.json.promo?.next?.discount_percent;
          const previousDiscount = item.json.promo?.history?.[0]?.discount_percent;

          let discountComparison = null;
          if (upcomingDiscount !== undefined && previousDiscount !== undefined) {
            if (upcomingDiscount > previousDiscount) {
              discountComparison = "greater";
            } else if (upcomingDiscount < previousDiscount) {
              discountComparison = "less";
            } else {
              discountComparison = "equal";
            }
          }

          const freeStock = item.json.stock?.free || 0;
          const cycleDays = item.json.promo?.promo_frequency_days;

          let risk: "low" | "high" | null = null;

          if (freeStock > 0 && discountComparison !== null) {
            if (discountComparison === "greater") {
              risk = "high";
            } else if (discountComparison === "equal" || discountComparison === "less") {
              risk = "low";
            }
          }

          return {
            sku: item.sku,
            title: item.json.title,
            publisher: item.json.publisher_name,
            stock: item.json.stock,
            promo: {
              status: item.json.promo?.on_promo
                ? "on_promo"
                : item.json.promo?.upcoming
                ? "upcoming"
                : null,
            },
            discountComparison,
            risk,
            cycleDays,
            raw: item.json,
          };
        });

        setItems(libraryData);
      } catch (error) {
        console.error("Failed to load library:", error);
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    let filtered = [...items];

    if (filters.inventory === "has_stock") {
      filtered = filtered.filter((item) => (item.stock?.free || 0) > 0);
    } else if (filters.inventory === "no_stock") {
      filtered = filtered.filter((item) => (item.stock?.free || 0) === 0);
    }

    if (filters.promo === "upcoming") {
      filtered = filtered.filter((item) => item.promo?.status === "upcoming");
    } else if (filters.promo === "on_promo") {
      filtered = filtered.filter((item) => item.promo?.status === "on_promo");
    }

    if (filters.discount === "greater") {
      filtered = filtered.filter((item) => item.discountComparison === "greater");
    } else if (filters.discount === "less") {
      filtered = filtered.filter((item) => item.discountComparison === "less");
    } else if (filters.discount === "equal") {
      filtered = filtered.filter((item) => item.discountComparison === "equal");
    }

    if (filters.risk === "high") {
      filtered = filtered.filter((item) => item.risk === "high");
    } else if (filters.risk === "low") {
      filtered = filtered.filter((item) => item.risk === "low");
    }

    if (sortBy === "stock-high") {
      filtered.sort((a, b) => (b.stock?.free || 0) - (a.stock?.free || 0));
    } else if (sortBy === "stock-low") {
      filtered.sort((a, b) => (a.stock?.free || 0) - (b.stock?.free || 0));
    }

    setFilteredItems(filtered);
  }, [items, filters, sortBy]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterConfig = [
    {
      key: "search",
      label: "Search",
      type: "text" as const,
      placeholder: "SKU or title...",
    },
    {
      key: "publisher",
      label: "Publisher",
      type: "select" as const,
      options: publishers.map((p) => ({ value: p, label: p })),
    },
    {
      key: "inventory",
      label: "Inventory",
      type: "select" as const,
      options: [
        { value: "has_stock", label: "Has Stock" },
        { value: "no_stock", label: "No Stock" },
      ],
    },
    {
      key: "promo",
      label: "Promo Status",
      type: "select" as const,
      options: [
        { value: "upcoming", label: "Upcoming" },
        { value: "on_promo", label: "On Promo" },
      ],
    },
    {
      key: "discount",
      label: "Promo Discount",
      type: "select" as const,
      options: [
        { value: "greater", label: "Greater" },
        { value: "equal", label: "Equal" },
        { value: "less", label: "Less" },
      ],
    },
    {
      key: "risk",
      label: "Risk",
      type: "select" as const,
      options: [
        { value: "high", label: "High Risk" },
        { value: "low", label: "Low Risk" },
      ],
    },
  ];

  const columns = [
    { key: "sku", header: "SKU" },
    {
      key: "title",
      header: "Title",
      render: (value: string) => (
        <div className="max-w-xs truncate">{value || "-"}</div>
      ),
    },
    { key: "publisher", header: "Publisher" },
    {
      key: "stock",
      header: (
        <button
          onClick={() => {
            if (sortBy === "stock-high") {
              setSortBy("stock-low");
            } else if (sortBy === "stock-low") {
              setSortBy("none");
            } else {
              setSortBy("stock-high");
            }
          }}
          className="flex items-center gap-1 hover:text-primary transition-colors font-medium"
        >
          Free Stock
          {sortBy === "stock-high" && <span className="text-xs">↓</span>}
          {sortBy === "stock-low" && <span className="text-xs">↑</span>}
        </button>
      ),
      render: (value: any) => value?.free || 0,
    },
    {
      key: "promo",
      header: "Promo Status",
      render: (value: any) => {
        if (!value?.status) return <Badge variant="outline">None</Badge>;
        if (value.status === "on_promo")
          return <Badge className="bg-green-600">On Promo</Badge>;
        if (value.status === "upcoming")
          return <Badge className="bg-blue-600">Upcoming</Badge>;
        return <Badge variant="outline">{value.status}</Badge>;
      },
    },
    {
      key: "discountComparison",
      header: "Promo Discount",
      render: (value: string) => {
        if (!value) return <span className="text-muted-foreground">-</span>;
        if (value === "greater")
          return <Badge className="bg-green-600">Greater</Badge>;
        if (value === "less")
          return <Badge className="bg-red-600">Less</Badge>;
        if (value === "equal")
          return <Badge className="bg-gray-600">Equal</Badge>;
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "risk",
      header: "Risk",
      render: (value: string | null) => {
        if (value === "high")
          return (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>High</span>
            </div>
          );
        if (value === "low")
          return (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Low</span>
            </div>
          );
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "raw",
      header: "Cycle Days",
      render: (value: any) => {
        const cycleDays = value?.promo?.promo_frequency_days;
        if (cycleDays === undefined || cycleDays === null) {
          return <span className="text-muted-foreground">-</span>;
        }
        return <span>{cycleDays}</span>;
      },
    },
    {
      key: "raw",
      header: "Promo Start",
      render: (value: any) => {
        if (!value?.promo?.next?.start) {
          return <span className="text-muted-foreground">-</span>;
        }
        const date = new Date(value.promo.next.start);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    {
      key: "raw",
      header: "Promo End",
      render: (value: any) => {
        if (!value?.promo?.next?.end) {
          return <span className="text-muted-foreground">-</span>;
        }
        const date = new Date(value.promo.next.end);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filterConfig}
        values={filters}
        onChange={handleFilterChange}
      />

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {totalCount} items
        </div>
        {totalPages > 1 && (
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      <Table
        columns={columns}
        data={filteredItems}
        onRowClick={(row) => setSelectedItem(row)}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}

      <JsonDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`SKU: ${selectedItem?.sku || ""}`}
        data={selectedItem?.raw || selectedItem}
      />
    </div>
  );
}
