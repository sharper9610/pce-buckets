'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { LibraryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, FileJson, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const ITEMS_PER_PAGE = 50;

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [publishers, setPublishers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadPublishers();
  }, []);

  useEffect(() => {
    loadItems();
  }, [currentPage, debouncedSearch, selectedPublisher]);

  async function loadPublishers() {
    const { data } = await supabase
      .from('library_items')
      .select('json->publisher, json->publisher_name')
      .not('json->publisher', 'is', null);

    if (data) {
      const uniquePublishers = Array.from(
        new Set(
          data
            .map((item: any) => item.json?.publisher || item.json?.publisher_name)
            .filter(Boolean)
        )
      ) as string[];
      setPublishers(uniquePublishers.sort());
    }
  }

  async function loadItems() {
    setIsLoading(true);
    try {
      let query = supabase
        .from('library_items')
        .select('sku, title, json, raw_json, updated_at', { count: 'exact' });

      if (debouncedSearch) {
        query = query.or(`sku.ilike.%${debouncedSearch}%,title.ilike.%${debouncedSearch}%`);
      }

      if (selectedPublisher !== 'all') {
        query = query.or(`json->>publisher.eq.${selectedPublisher},json->>publisher_name.eq.${selectedPublisher}`);
      }

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      if (data) {
        setItems(data);
        setTotalCount(count || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        const sku = json.sku || file.name.replace('.json', '');
        const title = json.title || json.name || '';

        const { error } = await supabase
          .from('library_items')
          .upsert({
            sku,
            title,
            json,
            raw_json: text,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          errorCount++;
          errors.push(`${file.name}: ${error.message}`);
          console.error('Upload error:', error);
        } else {
          successCount++;
        }
      } catch (err: any) {
        errorCount++;
        errors.push(`${file.name}: ${err.message}`);
        console.error('Upload error:', err);
      }
    }

    setIsUploading(false);
    loadItems();

    if (errorCount > 0) {
      toast({
        title: 'Upload Complete with Errors',
        description: `${successCount} file(s) uploaded successfully. ${errorCount} error(s). Check console for details.`,
        variant: errorCount === files.length ? 'destructive' : 'default',
      });
    } else {
      toast({
        title: 'Upload Complete',
        description: `${successCount} file(s) uploaded successfully.`,
      });
    }

    e.target.value = '';
  }

  async function deleteItem(sku: string) {
    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('sku', sku);

    if (!error) {
      toast({
        title: 'Item Deleted',
        description: `SKU ${sku} has been removed from the library.`,
      });
      loadItems();
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Library</h1>
            <p className="mt-1 text-sm text-slate-500">
              Master JSON library - {totalCount} SKU(s) {totalCount > ITEMS_PER_PAGE && `(showing ${items.length})`}
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload JSON'}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by SKU or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
            <Card key={item.sku} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.sku}</CardTitle>
                    {item.title && (
                      <CardDescription className="mt-1">
                        {item.title}
                      </CardDescription>
                    )}
                  </div>
                  <FileJson className="h-5 w-5 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                      >
                        View JSON
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>SKU: {item.sku}</DialogTitle>
                        <DialogDescription>
                          Last updated: {new Date(item.updated_at).toLocaleString()}
                        </DialogDescription>
                      </DialogHeader>
                      <pre className="mt-4 rounded-md bg-slate-900 p-4 text-sm text-slate-50 overflow-auto">
                        {item.raw_json || JSON.stringify(item.json, null, 2)}
                      </pre>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.sku)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-12">
                <FileJson className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-900">No items found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {searchQuery ? 'Try a different search query' : 'Upload JSON files to get started'}
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
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
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <span className="ml-4 text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>
      <Toaster />
    </div>
  );
}
