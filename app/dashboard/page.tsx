"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Percent, PiggyBank, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  predictedRevenue: number;
  predictedProfit: number;
  predictedSpend: number;
  marginPercent: string;
  lastUpdated: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    predictedRevenue: 0,
    predictedProfit: 0,
    predictedSpend: 0,
    marginPercent: "0.0",
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: forecastData, error: forecastError } = await supabase
          .from("buckets")
          .select("json, generated_at")
          .eq("name", "promo_forecast")
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (forecastError) throw forecastError;

        const forecast = forecastData?.json || {};
        const predictedRevenue = Math.round(forecast.total_predicted_revenue || 0);
        const predictedProfit = Math.round(forecast.total_predicted_profit || 0);
        const predictedSpend = Math.round(forecast.total_predicted_spend || 0);
        const marginPercent = predictedRevenue > 0 ? ((predictedProfit / predictedRevenue) * 100).toFixed(1) : "0.0";

        setStats({
          predictedRevenue,
          predictedProfit,
          predictedSpend,
          marginPercent,
          lastUpdated: forecastData?.generated_at || null,
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {stats.lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Updated {formatDistanceToNow(new Date(stats.lastUpdated), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Financial Forecast</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Predicted Spend"
              value={`$${stats.predictedSpend.toLocaleString()}`}
              icon={PiggyBank}
              description="Total investment"
            />
            <StatCard
              title="Predicted Revenue"
              value={`$${stats.predictedRevenue.toLocaleString()}`}
              icon={DollarSign}
              description="Expected sales"
            />
            <StatCard
              title="Predicted Profit"
              value={`$${stats.predictedProfit.toLocaleString()}`}
              icon={Percent}
              description="Net after spend"
            />
            <StatCard
              title="Margin"
              value={`${stats.marginPercent}%`}
              icon={Percent}
              description="Profit margin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
