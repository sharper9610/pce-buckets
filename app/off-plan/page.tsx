'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Table } from '@/components/Table';
import { OffPlanDrawer } from '@/components/OffPlanDrawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OffPlanItem {
  sku: string;
  title: string;
  publisher: string;
  status: 'ok' | 'warning' | 'critical';
  original_velocity: number;
  adjusted_velocity: number;
  original_optimal_units: number;
  adjusted_optimal_units: number;
  original_needed_units: number;
  adjusted_needed_units: number;
  original_margin: number;
  adjusted_margin: number;
  cycle_days?: number;
  stock_free?: number;
  avg_cost_eur?: number;
  offers?: Record<string, any>;
  sell?: {
    market?: string;
    iwtr_eur?: number;
  };
  promo?: {
    next?: {
      start?: string;
      end?: string;
      announced_at?: string;
      discount_percent?: number;
    };
  };
  suggestion?: string;
}

export default function OffPlanPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<OffPlanItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<OffPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<OffPlanItem | null>(null);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [publishers, setPublishers] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus) {
      return urlStatus.split(',');
    }
    return ['all'];
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: buyPlanBucket } = await supabase
        .from('buckets')
        .select('json')
        .eq('name', 'buy_plan')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const buyPlanItems = buyPlanBucket?.json?.items || [];

      const { data: libraryItems } = await supabase
        .from('library_items')
        .select('sku, json');

      const libraryMap = new Map(
        libraryItems?.map((item) => [item.sku, item.json]) || []
      );

      const bestMarginForItem = (offers: Record<string, any> | undefined) => {
        if (!offers) return 0;
        let bestMargin = 0;
        Object.values(offers).forEach((offer: any) => {
          if (offer.margin !== undefined && offer.margin > bestMargin) {
            bestMargin = offer.margin;
          }
        });
        return bestMargin;
      };

      const offPlanItems = buyPlanItems.map((item: any) => {
        const libraryData = libraryMap.get(item.sku.toString());
        const promoData = libraryData?.promo || item.promo;

        const margin = bestMarginForItem(item.offers);
        const velocity = item.velocity_per_day || 0;
        const stock = item.stock_free || 0;

        const daysUntilSoldOut = velocity > 0 ? stock / velocity : Infinity;

        const daysUntilPromo = promoData?.next?.start
          ? Math.round(
              (new Date(promoData.next.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          : item.promo?.cycle_days;

        let status: 'ok' | 'warning' | 'critical' = 'ok';

        if (margin < 0.05) {
          status = 'critical';
        } else if (margin < 0.08) {
          status = 'warning';
        } else if (daysUntilPromo && daysUntilPromo > 0 && velocity > 0) {
          const daysDifference = Math.abs(daysUntilSoldOut - daysUntilPromo);
          const percentageDifference = daysDifference / daysUntilPromo;

          if (percentageDifference > 0.5) {
            status = 'critical';
          } else if (percentageDifference > 0.25) {
            status = 'warning';
          }
        }

        return {
          sku: item.sku,
          title: item.title,
          publisher: item.publisher,
          status,
          original_velocity: item.velocity_per_day,
          adjusted_velocity: item.velocity_per_day,
          original_optimal_units: item.optimal_units || 0,
          adjusted_optimal_units: item.optimal_units || 0,
          original_needed_units: item.needed_units || 0,
          adjusted_needed_units: item.needed_units || 0,
          original_margin: margin,
          adjusted_margin: margin,
          cycle_days: item.promo?.cycle_days,
          stock_free: item.stock_free,
          avg_cost_eur: libraryData?.costs?.avg_cost_eur,
          offers: item.offers,
          sell: item.sell,
          promo: promoData,
          suggestion: '',
        };
      });

      setItems(offPlanItems);

      const uniquePublishers = Array.from(
        new Set(
          offPlanItems.map((item: OffPlanItem) => item.publisher).filter(Boolean)
        )
      ) as string[];
      setPublishers(uniquePublishers.sort());

      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = items.filter((item) => (item.stock_free || 0) > 0);

    if (selectedPublisher !== 'all') {
      filtered = filtered.filter((item) => item.publisher === selectedPublisher);
    }

    if (!statusFilter.includes('all')) {
      filtered = filtered.filter((item) => statusFilter.includes(item.status));
    }

    setFilteredItems(filtered);
  }, [items, selectedPublisher, statusFilter]);

  const getBestOffer = (offers: Record<string, any> | undefined) => {
    if (!offers) return { margin: 0, currency: '-' };

    let bestMargin = 0;
    let bestCurrency = '-';

    Object.entries(offers).forEach(([currency, offer]: [string, any]) => {
      if (offer.margin !== undefined && offer.margin > bestMargin) {
        bestMargin = offer.margin;
        bestCurrency = currency;
      }
    });

    return { margin: bestMargin, currency: bestCurrency };
  };

  const handleSaveItem = (updatedItem: OffPlanItem) => {
    setItems((prev) =>
      prev.map((item) =>
        item.sku === updatedItem.sku ? updatedItem : item
      )
    );
    toast.success(`Adjustments saved for ${updatedItem.sku}`);
  };

  const columns = [
    {
      key: 'status',
      header: '',
      render: (value: string) => {
        const colorMap = {
          critical: 'bg-red-600',
          warning: 'bg-orange-600',
          ok: 'bg-green-600',
        };
        return <div className={`w-3 h-3 rounded-full ${colorMap[value as keyof typeof colorMap]}`} />;
      },
    },
    { key: 'sku', header: 'SKU' },
    {
      key: 'title',
      header: 'Title',
      render: (value: string) => (
        <div className="max-w-xs truncate">{value || '-'}</div>
      ),
    },
    { key: 'publisher', header: 'Publisher' },
    {
      key: 'stock_free',
      header: 'Stock',
      render: (value: number) => {
        return <span>{value || 0}</span>;
      },
    },
    {
      key: 'avg_cost_eur',
      header: 'Avg Cost',
      render: (value: number) => {
        if (value === undefined || value === null) {
          return <span className="text-muted-foreground">-</span>;
        }
        return <span>€{value.toFixed(2)}</span>;
      },
    },
    {
      key: 'adjusted_velocity',
      header: 'Velocity/Day',
      render: (value: number, row: OffPlanItem) => {
        const hasChange = value !== row.original_velocity;
        return (
          <div className="flex flex-col">
            <span className={hasChange ? 'font-bold' : ''}>{Math.round(value)}</span>
            {hasChange && (
              <span className="text-xs text-muted-foreground">
                was {Math.round(row.original_velocity)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'days_until_sold_out',
      header: 'Days Until Sold Out',
      render: (value: any, row: OffPlanItem) => {
        const velocity = row.adjusted_velocity || 0;
        const stock = row.stock_free || 0;
        if (velocity === 0 || !stock) {
          return <span className="text-muted-foreground">-</span>;
        }
        const daysUntilSoldOut = Math.round(stock / velocity);

        const daysUntilPromo = row.promo?.next?.start
          ? Math.round(
              (new Date(row.promo.next.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          : row.cycle_days;

        let colorClass = '';
        let targetLabel = '';

        if (daysUntilPromo && daysUntilPromo > 0) {
          const daysDifference = Math.abs(daysUntilSoldOut - daysUntilPromo);
          const percentageDifference = daysDifference / daysUntilPromo;

          if (percentageDifference > 0.5) {
            colorClass = 'text-red-600 font-semibold';
          } else if (percentageDifference > 0.25) {
            colorClass = 'text-orange-600 font-semibold';
          } else {
            colorClass = 'text-green-600 font-semibold';
          }

          targetLabel = row.promo?.next?.start ? 'promo' : 'cycle';
        }

        return (
          <div className="flex flex-col">
            <span className={colorClass}>{daysUntilSoldOut} days</span>
            {daysUntilPromo && daysUntilPromo > 0 && (
              <span className="text-xs text-muted-foreground">
                target: {daysUntilPromo} days ({targetLabel})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'promo',
      header: 'Days Until Next Promo',
      render: (value: any) => {
        if (!value?.next?.start) {
          return <span className="text-muted-foreground">-</span>;
        }
        const daysUntilPromo = Math.round(
          (new Date(value.next.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilPromo < 0) {
          return <span className="text-muted-foreground">Promo started</span>;
        }

        return <span>{daysUntilPromo} days</span>;
      },
    },
    {
      key: 'sell',
      header: 'Eneba IWTR',
      render: (value: any) => {
        return value?.iwtr_eur ? `€${value.iwtr_eur.toFixed(2)}` : '-';
      },
    },
    {
      key: 'adjusted_margin',
      header: 'Margin',
      render: (value: number, row: OffPlanItem) => {
        const avgCost = row.avg_cost_eur;
        const iwtr = row.sell?.iwtr_eur;

        if (!avgCost || !iwtr) {
          return <span className="text-muted-foreground">-</span>;
        }

        const margin = ((iwtr - avgCost) / iwtr) * 100;

        return (
          <span>
            {margin.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'suggestion',
      header: 'Suggestion',
      render: (value: string) => (
        <div className="max-w-xs truncate">{value || '-'}</div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading tracked games...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm">Status Indicators</h3>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span><span className="font-medium">Green:</span> Stock timing aligns well with promo schedule and margin is healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span><span className="font-medium">Yellow:</span> Stock timing is somewhat misaligned with promo or margin is low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span><span className="font-medium">Red:</span> Critical issue - significant timing mismatch or very low margin</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="text-muted-foreground text-sm">
          {filteredItems.length} of {items.length} items
        </div>

        <div className="w-64">
          <Select value={selectedPublisher} onValueChange={setSelectedPublisher}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by publisher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Publishers</SelectItem>
              {publishers.map((publisher) => (
                <SelectItem key={publisher} value={publisher}>
                  {publisher}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter(['all'])}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                statusFilter.includes('all')
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                if (statusFilter.includes('ok')) {
                  const newFilter = statusFilter.filter(s => s !== 'ok');
                  setStatusFilter(newFilter.length === 0 ? ['all'] : newFilter);
                } else {
                  setStatusFilter([...statusFilter.filter(s => s !== 'all'), 'ok']);
                }
              }}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-2 ${
                statusFilter.includes('ok')
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              Green
            </button>
            <button
              onClick={() => {
                if (statusFilter.includes('warning')) {
                  const newFilter = statusFilter.filter(s => s !== 'warning');
                  setStatusFilter(newFilter.length === 0 ? ['all'] : newFilter);
                } else {
                  setStatusFilter([...statusFilter.filter(s => s !== 'all'), 'warning']);
                }
              }}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-2 ${
                statusFilter.includes('warning')
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              Yellow
            </button>
            <button
              onClick={() => {
                if (statusFilter.includes('critical')) {
                  const newFilter = statusFilter.filter(s => s !== 'critical');
                  setStatusFilter(newFilter.length === 0 ? ['all'] : newFilter);
                } else {
                  setStatusFilter([...statusFilter.filter(s => s !== 'all'), 'critical']);
                }
              }}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-2 ${
                statusFilter.includes('critical')
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              Red
            </button>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredItems}
        onRowClick={(row) => setSelectedItem(row)}
      />

      <OffPlanDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        onSave={handleSaveItem}
      />
    </div>
  );
}
