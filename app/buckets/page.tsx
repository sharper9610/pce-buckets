'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bucket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Box, Download, History, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function BucketsPage() {
  const [buckets, setBuckets] = useState<Record<string, Bucket[]>>({});
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBuckets();
  }, []);

  async function loadBuckets() {
    const { data, error } = await supabase
      .from('buckets')
      .select('*')
      .order('generated_at', { ascending: false });

    if (data) {
      const grouped = data.reduce((acc, bucket) => {
        if (!acc[bucket.name]) {
          acc[bucket.name] = [];
        }
        acc[bucket.name].push(bucket);
        return acc;
      }, {} as Record<string, Bucket[]>);
      setBuckets(grouped);
    }
  }

  function downloadJSON(bucket: Bucket) {
    const blob = new Blob([JSON.stringify(bucket.json, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bucket.name}_v${bucket.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteBucket(bucketId: string) {
    const { error } = await supabase
      .from('buckets')
      .delete()
      .eq('id', bucketId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete bucket',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Bucket deleted successfully',
    });

    loadBuckets();
  }

  const bucketNames = Object.keys(buckets);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Buckets</h1>
            <p className="mt-1 text-sm text-slate-500">
              Generated data buckets - {bucketNames.length} bucket(s)
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {bucketNames.length === 0 ? (
          <div className="text-center py-12">
            <Box className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No buckets yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Run a script to generate your first bucket
            </p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {bucketNames.map((name) => {
              const versions = buckets[name];
              const latest = versions[0];

              return (
                <Card key={name} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{name}</CardTitle>
                        <CardDescription className="mt-1">
                          Version {latest.version} • {versions.length} version(s)
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        v{latest.version}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-slate-500">
                      Generated: {new Date(latest.generated_at).toLocaleString()}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBucket(latest)}
                          >
                            View JSON
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>{name} (v{latest.version})</DialogTitle>
                            <DialogDescription>
                              Generated: {new Date(latest.generated_at).toLocaleString()}
                            </DialogDescription>
                          </DialogHeader>
                          <pre className="mt-4 rounded-md bg-slate-900 p-4 text-sm text-slate-50 overflow-auto">
                            {JSON.stringify(latest.json, null, 2)}
                          </pre>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadJSON(latest)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBucket(latest.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {versions.length > 1 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingHistory(name)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Version History: {name}</DialogTitle>
                              <DialogDescription>
                                {versions.length} version(s)
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-2 max-h-96 overflow-auto">
                              {versions.map((version) => (
                                <div
                                  key={version.id}
                                  className="flex items-center justify-between p-3 border rounded-md"
                                >
                                  <div>
                                    <div className="font-medium">
                                      Version {version.version}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {new Date(version.generated_at).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedBucket(version)}
                                        >
                                          View
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                                        <DialogHeader>
                                          <DialogTitle>
                                            {name} (v{version.version})
                                          </DialogTitle>
                                          <DialogDescription>
                                            Generated: {new Date(version.generated_at).toLocaleString()}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <pre className="mt-4 rounded-md bg-slate-900 p-4 text-sm text-slate-50 overflow-auto">
                                          {JSON.stringify(version.json, null, 2)}
                                        </pre>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => downloadJSON(version)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteBucket(version.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
