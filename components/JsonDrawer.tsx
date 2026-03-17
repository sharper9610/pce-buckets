"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JsonDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: any;
  customSections?: React.ReactNode;
}

export function JsonDrawer({ open, onClose, title, data, customSections }: JsonDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Item details</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {customSections && (
            <div className="mb-4">
              {customSections}
            </div>
          )}
          <div className="text-xs text-slate-500 mb-2">Raw JSON data</div>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
