'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Table } from '@/components/Table';
import { JsonDrawer } from '@/components/JsonDrawer';
import { ChevronDown, ChevronUp, Save, Calculator, X, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BuyPlanItem {
  sku: number;
  title: string;
  publisher: string;
  sell: {
    market: string;
    iwtr_eur: number;
  };
  promo: {
    status: string;
    cycle_days: number;
    discount_percent: number;
  };
  stock_free: number;
  needed_units: number;
  optimal_units: number;
  velocity_per_day: number;
  release_date: string;
  offers: Record<string, any>;
  best_offer?: {
    currency: string;
    cost_eur: number;
    margin: number;
  };
  offer_splits?: Record<string, number>;
  need?: number;
}

export default function BuyPlanPage() {
  const [items, setItems] = useState<BuyPlanItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BuyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BuyPlanItem | null>(null);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [publishers, setPublishers] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [selectedBucket, setSelectedBucket] = useState<string>('buy_plan_v4');
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [preferredCurrencies, setPreferredCurrencies] = useState<Record<string, string[]>>({});
  const [showPositiveMarginOnly, setShowPositiveMarginOnly] = useState<boolean>(false);
  const [savedOrders, setSavedOrders] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previousMargins, setPreviousMargins] = useState<Record<number, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailableBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchData();
    }
  }, [selectedBucket]);

  useEffect(() => {
    let filtered = items;

    if (selectedPublisher !== 'all') {
      filtered = filtered.filter(item => item.publisher === selectedPublisher);
    }

    if (showPositiveMarginOnly) {
      filtered = filtered.filter(item => {
        if (!item.best_offer) return false;
        return item.best_offer.margin > 0;
      });
    }

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.sku.toString().includes(lowerSearch) ||
        item.title.toLowerCase().includes(lowerSearch) ||
        item.publisher.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredItems(filtered);
  }, [selectedPublisher, items, showPositiveMarginOnly, searchTerm]);

  const fetchAvailableBuckets = async () => {
    try {
      const { data: buckets } = await supabase
        .from('buckets')
        .select('name')
        .like('name', 'buy_plan%')
        .order('name', { ascending: false });

      if (buckets) {
        const bucketNames = Array.from(new Set(buckets.map(b => b.name)));
        setAvailableBuckets(bucketNames);
        if (bucketNames.length > 0 && !bucketNames.includes(selectedBucket)) {
          setSelectedBucket(bucketNames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: buckets } = await supabase
        .from('buckets')
        .select('json, generated_at')
        .eq('name', selectedBucket)
        .order('generated_at', { ascending: false })
        .limit(2);

      if (buckets && buckets.length > 0) {
        const latestBucket = buckets[0];
        const buyPlanItems = latestBucket.json.items;
        setItems(buyPlanItems);
        setFilteredItems(buyPlanItems);

        if (latestBucket.generated_at) {
          setGeneratedAt(new Date(latestBucket.generated_at).toLocaleString());
        }

        const uniquePublishers = Array.from(
          new Set(buyPlanItems.map((item: BuyPlanItem) => item.publisher))
        ).sort() as string[];
        setPublishers(uniquePublishers);

        if (buckets.length > 1) {
          const previousBucket = buckets[1];
          const prevMargins: Record<number, number> = {};
          if (previousBucket.json?.items) {
            previousBucket.json.items.forEach((item: BuyPlanItem) => {
              if (item.best_offer) {
                prevMargins[item.sku] = item.best_offer.margin * 100;
              }
            });
          }
          setPreviousMargins(prevMargins);
        }
      }

      await fetchSavedOrders();
    } catch (error) {
      console.error('Error fetching buy plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedOrders = async () => {
    try {
      const { data: orders } = await supabase
        .from('saved_orders')
        .select('sku, currency, percentage')
        .eq('bucket_name', selectedBucket);

      if (orders) {
        const savedMap: Record<string, number> = {};
        orders.forEach(order => {
          const key = `${order.sku}-${order.currency}`;
          savedMap[key] = order.percentage;
        });
        setSavedOrders(savedMap);
      }
    } catch (error) {
      console.error('Error fetching saved orders:', error);
    }
  };

  const saveOrder = async (sku: number, currency: string, percentage: number) => {
    try {
      const { error } = await supabase
        .from('saved_orders')
        .upsert({
          sku,
          currency,
          percentage,
          bucket_name: selectedBucket,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'sku,currency,bucket_name'
        });

      if (error) throw error;

      setSavedOrders(prev => ({
        ...prev,
        [`${sku}-${currency}`]: percentage
      }));

      return true;
    } catch (error) {
      console.error('Error saving order:', error);
      return false;
    }
  };

  const clearSavedOrder = async (sku: number, currency: string) => {
    try {
      const { error } = await supabase
        .from('saved_orders')
        .delete()
        .eq('sku', sku)
        .eq('currency', currency)
        .eq('bucket_name', selectedBucket);

      if (error) throw error;

      setSavedOrders(prev => {
        const newSaved = { ...prev };
        delete newSaved[`${sku}-${currency}`];
        return newSaved;
      });

      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[`${sku}-${currency}`];
        return newQuantities;
      });

      return true;
    } catch (error) {
      console.error('Error clearing saved order:', error);
      return false;
    }
  };

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

  const getMarginTrend = (sku: number, currentMarginPercent: number) => {
    const previousMargin = previousMargins[sku];
    if (previousMargin === undefined) {
      return null;
    }

    const diff = currentMarginPercent - previousMargin;
    const threshold = 0.1;

    if (Math.abs(diff) < threshold) {
      return { icon: Minus, color: 'text-slate-400', diff };
    } else if (diff > 0) {
      return { icon: TrendingUp, color: 'text-green-600', diff };
    } else {
      return { icon: TrendingDown, color: 'text-red-600', diff };
    }
  };

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (_: any, item: BuyPlanItem) => item.sku.toString()
    },
    {
      key: 'title',
      header: 'Title',
      render: (_: any, item: BuyPlanItem) => (
        <div className="max-w-xs truncate" title={item.title}>
          {item.title}
        </div>
      )
    },
    {
      key: 'publisher',
      header: 'Publisher',
      render: (_: any, item: BuyPlanItem) => (
        <div className="max-w-xs truncate" title={item.publisher}>
          {item.publisher}
        </div>
      )
    },
    {
      key: 'promo_status',
      header: 'Promo',
      render: (_: any, item: BuyPlanItem) => (
        <span className={`px-2 py-1 text-xs rounded ${
          item.promo.status === 'on_promo'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {item.promo.status === 'on_promo' ? 'Active' : 'Upcoming'}
        </span>
      )
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (_: any, item: BuyPlanItem) => `${item.promo.discount_percent}%`
    },
    {
      key: 'best_offer',
      header: 'Best Offer',
      render: (_: any, item: BuyPlanItem) => {
        if (item.best_offer) {
          return (
            <div className="flex flex-col">
              <span className="text-xs font-semibold">{item.best_offer.currency}</span>
              <span className="text-xs text-slate-600">€{item.best_offer.cost_eur.toFixed(2)}</span>
            </div>
          );
        }
        const margin = bestMarginForItem(item.offers);
        return (
          <span className="text-xs text-slate-400">
            {margin > 0 ? `${(margin * 100).toFixed(1)}%` : 'N/A'}
          </span>
        );
      }
    },
    {
      key: 'margin',
      header: 'Margin',
      render: (_: any, item: BuyPlanItem) => {
        const margin = item.best_offer ? item.best_offer.margin : bestMarginForItem(item.offers);
        const marginPercent = item.best_offer ? margin * 100 : margin;
        return (
          <span className={`font-semibold ${marginPercent < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {marginPercent.toFixed(1)}%
          </span>
        );
      }
    },
    {
      key: 'velocity',
      header: 'Velocity/Day',
      render: (_: any, item: BuyPlanItem) => item.velocity_per_day.toFixed(1)
    },
    {
      key: 'needed_units',
      header: 'Need/Optimal',
      render: (_: any, item: BuyPlanItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-orange-600">{item.needed_units.toLocaleString()}</span>
          <span className="text-xs text-slate-500">{item.optimal_units.toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'stock_free',
      header: 'Stock',
      render: (_: any, item: BuyPlanItem) => item.stock_free.toLocaleString()
    },
    {
      key: 'iwtr',
      header: 'IWTR',
      render: (_: any, item: BuyPlanItem) => `€${item.sell.iwtr_eur.toFixed(2)}`
    },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500">Loading buy plan...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Buy Plan</h1>
            <p className="mt-1 text-sm text-slate-500">
              {filteredItems.length} items to buy
              {generatedAt && ` • Generated at ${generatedAt}`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4 items-center">
          <div className="w-64">
            <Select value={selectedBucket} onValueChange={setSelectedBucket}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {availableBuckets.map((bucket) => (
                  <SelectItem key={bucket} value={bucket}>
                    {bucket.replace('buy_plan', 'Buy Plan').replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <Select value={selectedPublisher} onValueChange={setSelectedPublisher}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by publisher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publishers ({items.length})</SelectItem>
                {publishers.map((publisher) => (
                  <SelectItem key={publisher} value={publisher}>
                    {publisher} ({items.filter(i => i.publisher === publisher).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="positive-margin"
              checked={showPositiveMarginOnly}
              onCheckedChange={(checked) => setShowPositiveMarginOnly(checked === true)}
            />
            <Label
              htmlFor="positive-margin"
              className="text-sm font-medium cursor-pointer"
            >
              Show only positive margin
            </Label>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                type="text"
                placeholder="Search by SKU, title, or publisher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="shrink-0"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900">No items found</h3>
              <p className="mt-2 text-sm text-slate-500">
                {searchTerm
                  ? 'No items match your search'
                  : selectedPublisher !== 'all'
                  ? 'Try selecting a different publisher'
                  : 'Run the buy_plan script to generate data'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {selectedItem && (
        <JsonDrawer
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`SKU: ${selectedItem.sku} - ${selectedItem.title}`}
          data={selectedItem}
        />
      )}
    </div>
  );
}
