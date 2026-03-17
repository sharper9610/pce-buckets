'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { runScript } from '@/lib/actions';
import { ScriptDefinition, ScriptSchedule } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code, Play, Plus, CreditCard as Edit, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const DEFAULT_SCRIPT = `export default function run({ LIBRARY = {}, BUCKETS = {} }) {
  // Your transformation logic here
  const items = Object.values(LIBRARY).map((item: any) => {
    return {
      sku: item.sku,
      // Add your transformations
    };
  });

  return {
    bucket: "my_bucket",
    count: items.length,
    items
  };
}`;

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [schedules, setSchedules] = useState<ScriptSchedule[]>([]);
  const [editingScript, setEditingScript] = useState<ScriptDefinition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedScriptForSchedule, setSelectedScriptForSchedule] = useState<ScriptDefinition | null>(null);
  const [scheduleIntervalHours, setScheduleIntervalHours] = useState<string>('12');
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<string>('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ts_code: DEFAULT_SCRIPT,
    read_library: false,
    input_bucket_names: [] as string[],
    output_bucket_name: '',
  });

  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);

  useEffect(() => {
    loadScripts();
    loadAvailableBuckets();
    loadSchedules();
  }, []);

  async function loadScripts() {
    const { data } = await supabase
      .from('script_definitions')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setScripts(data);
    }
  }

  async function loadSchedules() {
    const { data } = await supabase
      .from('script_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setSchedules(data);
    }
  }

  async function loadAvailableBuckets() {
    const { data } = await supabase
      .from('buckets')
      .select('name')
      .order('name');

    if (data) {
      const uniqueNames = Array.from(new Set(data.map(b => b.name)));
      setAvailableBuckets(uniqueNames);
    }
  }

  function openCreateDialog() {
    setEditingScript(null);
    setFormData({
      name: '',
      description: '',
      ts_code: DEFAULT_SCRIPT,
      read_library: false,
      input_bucket_names: [],
      output_bucket_name: '',
    });
    setIsDialogOpen(true);
  }

  function openEditDialog(script: ScriptDefinition) {
    setEditingScript(script);
    setFormData({
      name: script.name,
      description: script.description,
      ts_code: script.ts_code,
      read_library: script.read_library,
      input_bucket_names: script.input_bucket_names,
      output_bucket_name: script.output_bucket_name,
    });
    setIsDialogOpen(true);
  }

  async function saveScript() {
    if (!formData.name || !formData.output_bucket_name) {
      toast({
        title: 'Validation Error',
        description: 'Name and output bucket name are required.',
        variant: 'destructive',
      });
      return;
    }

    const scriptData = {
      name: formData.name,
      description: formData.description,
      ts_code: formData.ts_code,
      read_library: formData.read_library,
      input_bucket_names: formData.input_bucket_names,
      output_bucket_name: formData.output_bucket_name,
      updated_at: new Date().toISOString(),
    };

    if (editingScript) {
      const { error } = await supabase
        .from('script_definitions')
        .update(scriptData)
        .eq('id', editingScript.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('script_definitions')
        .insert({
          ...scriptData,
          created_at: new Date().toISOString(),
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    }

    toast({
      title: 'Success',
      description: `Script ${editingScript ? 'updated' : 'created'} successfully.`,
    });

    setIsDialogOpen(false);
    loadScripts();
  }

  async function handleRunScript(scriptName: string) {
    setIsRunning(scriptName);
    setRunLogs('Starting script execution...\n');

    try {
      const result = await runScript(scriptName);

      if (result.success) {
        setRunLogs(prev => prev + '\nScript executed successfully!\n');
        toast({
          title: 'Success',
          description: 'Script executed successfully.',
        });
        loadAvailableBuckets();
      } else {
        setRunLogs(prev => prev + `\nError: ${result.error}\n`);
        toast({
          title: 'Execution Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setRunLogs(prev => prev + `\nError: ${error.message}\n`);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(null);
    }
  }

  function toggleInputBucket(bucketName: string) {
    setFormData(prev => ({
      ...prev,
      input_bucket_names: prev.input_bucket_names.includes(bucketName)
        ? prev.input_bucket_names.filter(n => n !== bucketName)
        : [...prev.input_bucket_names, bucketName],
    }));
  }


  function openScheduleDialog(script: ScriptDefinition) {
    const existingSchedule = schedules.find(s => s.script_definition_id === script.id);
    if (existingSchedule) {
      setScheduleIntervalHours(existingSchedule.interval_hours.toString());
    } else {
      setScheduleIntervalHours('12');
    }
    setSelectedScriptForSchedule(script);
    setIsScheduleDialogOpen(true);
  }

  async function saveSchedule() {
    if (!selectedScriptForSchedule) return;

    const intervalHours = parseInt(scheduleIntervalHours);
    if (isNaN(intervalHours) || intervalHours <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Interval must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    const existingSchedule = schedules.find(s => s.script_definition_id === selectedScriptForSchedule.id);
    const nextRunAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();

    if (existingSchedule) {
      const { error } = await supabase
        .from('script_schedules')
        .update({
          interval_hours: intervalHours,
          next_run_at: nextRunAt,
        })
        .eq('id', existingSchedule.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('script_schedules')
        .insert({
          script_definition_id: selectedScriptForSchedule.id,
          interval_hours: intervalHours,
          next_run_at: nextRunAt,
          enabled: true,
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    }

    toast({
      title: 'Success',
      description: 'Schedule saved successfully.',
    });

    setIsScheduleDialogOpen(false);
    loadSchedules();
  }

  async function toggleSchedule(scheduleId: string, currentEnabled: boolean) {
    const { error } = await supabase
      .from('script_schedules')
      .update({ enabled: !currentEnabled })
      .eq('id', scheduleId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: `Schedule ${!currentEnabled ? 'enabled' : 'disabled'}.`,
    });

    loadSchedules();
  }

  async function deleteSchedule(scheduleId: string) {
    const { error } = await supabase
      .from('script_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Schedule deleted.',
    });

    loadSchedules();
  }

  async function deleteScript(scriptId: string) {
    const { error: scheduleError } = await supabase
      .from('script_schedules')
      .delete()
      .eq('script_definition_id', scriptId);

    const { error } = await supabase
      .from('script_definitions')
      .delete()
      .eq('id', scriptId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Script deleted.',
    });

    loadScripts();
    loadSchedules();
  }

  function getScheduleForScript(scriptId: string): ScriptSchedule | undefined {
    return schedules.find(s => s.script_definition_id === scriptId);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Scripts</h1>
            <p className="mt-1 text-sm text-slate-500">
              TypeScript transformation scripts - {scripts.length} script(s)
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Script
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {scripts.length === 0 ? (
          <div className="text-center py-12">
            <Code className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No scripts yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create your first transformation script
            </p>
            <div className="mt-6">
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Script
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1">
            {scripts.map((script) => (
              <Card key={script.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{script.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {script.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openScheduleDialog(script)}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(script)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteScript(script.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRunScript(script.name)}
                        disabled={isRunning === script.name}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {isRunning === script.name ? 'Running...' : 'Run'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Output:</span>{' '}
                      <span className="text-slate-600">{script.output_bucket_name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Reads Library:</span>{' '}
                      <span className="text-slate-600">{script.read_library ? 'Yes' : 'No'}</span>
                    </div>
                    {script.input_bucket_names.length > 0 && (
                      <div>
                        <span className="font-medium">Input Buckets:</span>{' '}
                        <span className="text-slate-600">
                          {script.input_bucket_names.join(', ')}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const schedule = getScheduleForScript(script.id);
                      if (schedule) {
                        return (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-slate-600">
                              Scheduled: Every {schedule.interval_hours} hours
                              {!schedule.enabled && ' (Disabled)'}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {runLogs && (
        <div className="border-t bg-slate-50 p-4">
          <h3 className="text-sm font-medium mb-2">Execution Logs</h3>
          <pre className="text-xs bg-slate-900 text-slate-50 p-3 rounded-md overflow-auto max-h-32">
            {runLogs}
          </pre>
        </div>
      )}

      <Toaster />
    </div>
  );
}
