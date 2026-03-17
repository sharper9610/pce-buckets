"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

interface OffPlanDrawerProps {
  open: boolean;
  onClose: () => void;
  item: OffPlanItem | null;
  onSave: (item: OffPlanItem) => void;
}

export function OffPlanDrawer({ open, onClose, item, onSave }: OffPlanDrawerProps) {
  const [editedItem, setEditedItem] = React.useState<OffPlanItem | null>(item);

  React.useEffect(() => {
    if (item) {
      setEditedItem({ ...item });
    }
  }, [item]);

  if (!editedItem) return null;

  const handleSave = () => {
    onSave(editedItem);
    onClose();
  };

  const cycleDays = editedItem.cycle_days || 0;
  const stockFree = editedItem.stock_free || 0;
  const velocity = editedItem.adjusted_velocity || 0;

  const daysUntilPromo = editedItem.promo?.next?.start
    ? Math.max(0, Math.round((new Date(editedItem.promo.next.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : cycleDays;

  const daysOfStock = velocity > 0 ? stockFree / velocity : 0;
  const stockDepletionPercent = daysUntilPromo > 0 ? Math.min((daysOfStock / daysUntilPromo) * 100, 100) : 0;
  const targetStockPercent = 10;

  let stockStatus: 'good' | 'warning' | 'critical' = 'good';
  let stockStatusText = '';

  if (stockDepletionPercent > 50) {
    stockStatus = 'critical';
    stockStatusText = 'Overstocked - will have excess inventory at next promo';
  } else if (stockDepletionPercent > 25) {
    stockStatus = 'warning';
    stockStatusText = 'Higher than ideal - may have leftover stock';
  } else if (stockDepletionPercent < 5 && stockFree > 0) {
    stockStatus = 'warning';
    stockStatusText = 'May run out before next promo cycle';
  } else {
    stockStatus = 'good';
    stockStatusText = 'Stock level aligned with promo cycle';
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Adjust Values - {editedItem.sku}</SheetTitle>
          <SheetDescription>
            Make adjustments to forecasted values
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6 pr-4">
            <div>
              <h3 className="font-semibold mb-2">Product Info</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Title:</span> {editedItem.title}</div>
                <div><span className="text-muted-foreground">Publisher:</span> {editedItem.publisher}</div>
              </div>
            </div>

            {daysUntilPromo > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-3">Stock Runway vs Promo Cycle</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Free Stock:</span>
                    <span className="font-medium">{stockFree} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Days Until Next Promo:</span>
                    <span className="font-medium">{daysUntilPromo} days</span>
                  </div>
                  {cycleDays > 0 && cycleDays !== daysUntilPromo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Promo Cycle Frequency:</span>
                      <span className="font-medium">{cycleDays} days</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock Will Last:</span>
                    <span className="font-medium">{Math.round(daysOfStock)} days</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Stock Coverage</span>
                      <span className={`font-medium ${
                        stockStatus === 'critical' ? 'text-red-600' :
                        stockStatus === 'warning' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {Math.round(stockDepletionPercent)}% of cycle
                      </span>
                    </div>

                    <div className="relative w-full h-8 bg-background border rounded overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full transition-all ${
                          stockStatus === 'critical' ? 'bg-red-500/20 border-r-2 border-red-500' :
                          stockStatus === 'warning' ? 'bg-yellow-500/20 border-r-2 border-yellow-500' :
                          'bg-green-500/20 border-r-2 border-green-500'
                        }`}
                        style={{ width: `${stockDepletionPercent}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-blue-500"
                        style={{ left: `${targetStockPercent}%` }}
                        title={`Target: ${targetStockPercent}%`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-foreground/70">
                          Target: {targetStockPercent}%
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs mt-2 ${
                      stockStatus === 'critical' ? 'text-red-600' :
                      stockStatus === 'warning' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {stockStatusText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="velocity">Velocity per Day</Label>
                <Input
                  id="velocity"
                  type="number"
                  step="1"
                  value={Math.round(editedItem.adjusted_velocity)}
                  onChange={(e) => {
                    setEditedItem({
                      ...editedItem,
                      adjusted_velocity: parseFloat(e.target.value) || 0,
                    });
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {Math.round(editedItem.original_velocity)}
                </p>
              </div>

              <div>
                <Label htmlFor="optimal">Optimal Units</Label>
                <Input
                  id="optimal"
                  type="number"
                  value={editedItem.adjusted_optimal_units}
                  onChange={(e) => {
                    setEditedItem({
                      ...editedItem,
                      adjusted_optimal_units: parseInt(e.target.value) || 0,
                    });
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {editedItem.original_optimal_units}
                </p>
              </div>

              <div>
                <Label htmlFor="needed">Needed Units</Label>
                <Input
                  id="needed"
                  type="number"
                  value={editedItem.adjusted_needed_units}
                  onChange={(e) => {
                    setEditedItem({
                      ...editedItem,
                      adjusted_needed_units: parseInt(e.target.value) || 0,
                    });
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {editedItem.original_needed_units}
                </p>
              </div>

              <div>
                <Label htmlFor="margin">Best Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  step="1"
                  value={Math.round(editedItem.adjusted_margin * 100)}
                  onChange={(e) => {
                    setEditedItem({
                      ...editedItem,
                      adjusted_margin: (parseFloat(e.target.value) || 0) / 100,
                    });
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Original: {Math.round(editedItem.original_margin * 100)}%
                </p>
              </div>

              <div>
                <Label htmlFor="suggestion">Suggestion</Label>
                <Textarea
                  id="suggestion"
                  value={editedItem.suggestion || ''}
                  onChange={(e) => {
                    setEditedItem({
                      ...editedItem,
                      suggestion: e.target.value,
                    });
                  }}
                  className="mt-1"
                  rows={3}
                  placeholder="Enter adjustment reasoning or suggestions..."
                />
              </div>
            </div>

            <div className="pt-4">
              <h3 className="font-semibold mb-2">Additional Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Eneba IWTR:</span>{' '}
                  {editedItem.sell?.iwtr_eur ? `€${Math.round(editedItem.sell.iwtr_eur)}` : '-'}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                Save Adjustments
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>

            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-2">Raw JSON</h3>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(editedItem, null, 2)}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
