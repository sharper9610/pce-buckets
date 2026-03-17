'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Run } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CirclePlay as PlayCircle, CircleCheck as CheckCircle2, Circle as XCircle, FileText, Download } from 'lucide-react';

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    const { data } = await supabase
      .from('runs')
      .select('*')
      .order('started_at', { ascending: false });

    if (data) {
      setRuns(data);
    }
  }

  function formatDuration(startedAt: string, finishedAt?: string) {
    if (!finishedAt) return 'In progress';
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const duration = (end - start) / 1000;
    return `${Math.round(duration)}s`;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Runs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Script execution history - {runs.length} run(s)
            </p>
          </div>
          <Button
            onClick={() => window.location.href = '/api/download-project'}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Project
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {runs.length === 0 ? (
          <div className="text-center py-12">
            <PlayCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No runs yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Execute a script to see run history
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle>{run.script_name}</CardTitle>
                        <Badge
                          variant={run.status === 'success' ? 'default' : 'destructive'}
                        >
                          {run.status === 'success' ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {run.status}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        Started: {new Date(run.started_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRun(run)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>{run.script_name}</DialogTitle>
                          <DialogDescription>
                            Run ID: {run.id}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 space-y-4">
                          <div>
                            <h3 className="text-sm font-medium mb-2">Status</h3>
                            <Badge
                              variant={run.status === 'success' ? 'default' : 'destructive'}
                            >
                              {run.status}
                            </Badge>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium mb-2">Timing</h3>
                            <div className="text-sm space-y-1">
                              <div>
                                <span className="text-slate-500">Started:</span>{' '}
                                {new Date(run.started_at).toLocaleString()}
                              </div>
                              {run.finished_at && (
                                <>
                                  <div>
                                    <span className="text-slate-500">Finished:</span>{' '}
                                    {new Date(run.finished_at).toLocaleString()}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Duration:</span>{' '}
                                    {formatDuration(run.started_at, run.finished_at)}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {Object.keys(run.input_bucket_versions).length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium mb-2">Input Buckets</h3>
                              <div className="text-sm space-y-1">
                                {Object.entries(run.input_bucket_versions).map(([name, version]) => (
                                  <div key={name}>
                                    <span className="font-mono">{name}</span> v{version as number}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {run.output_bucket_name && (
                            <div>
                              <h3 className="text-sm font-medium mb-2">Output</h3>
                              <div className="text-sm">
                                <span className="font-mono">{run.output_bucket_name}</span> v
                                {run.output_bucket_version}
                              </div>
                            </div>
                          )}

                          <div>
                            <h3 className="text-sm font-medium mb-2">Logs</h3>
                            <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded-md overflow-auto max-h-64">
                              {run.logs || 'No logs available'}
                            </pre>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      {run.output_bucket_name && (
                        <div>
                          <span className="text-slate-500">Output:</span>{' '}
                          <span className="font-mono">{run.output_bucket_name}</span> v
                          {run.output_bucket_version}
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Duration:</span>{' '}
                        {formatDuration(run.started_at, run.finished_at)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
