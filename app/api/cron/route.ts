import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { executeScript } from '@/lib/script-executor';

export async function POST() {
  try {
    const supabase = getSupabaseServer();

    const now = new Date().toISOString();

    const { data: schedules, error: scheduleError } = await supabase
      .from('script_schedules')
      .select('*, script_definitions(*)')
      .eq('enabled', true)
      .lte('next_run_at', now);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'No scripts to run', executed: 0 });
    }

    const results = [];

    for (const schedule of schedules) {
      const script = schedule.script_definitions;

      if (!script) {
        console.error(`Script not found for schedule ${schedule.id}`);
        continue;
      }

      const runId = crypto.randomUUID();
      const startedAt = new Date().toISOString();

      await supabase.from('runs').insert({
        id: runId,
        script_name: script.name,
        started_at: startedAt,
        status: 'failed',
        logs: '',
        input_bucket_versions: {},
      });

      let context: any = {};

      if (script.read_library) {
        const { data: libraryItems } = await supabase
          .from('library_items')
          .select('*');

        context.LIBRARY = {};
        if (libraryItems) {
          for (const item of libraryItems) {
            context.LIBRARY[item.sku] = item.json;
          }
        }
      }

      if (script.input_bucket_names && script.input_bucket_names.length > 0) {
        context.BUCKETS = {};
        const inputVersions: Record<string, number> = {};

        for (const bucketName of script.input_bucket_names) {
          const { data: buckets } = await supabase
            .from('buckets')
            .select('*')
            .eq('name', bucketName)
            .order('version', { ascending: false })
            .limit(1);

          if (buckets && buckets.length > 0) {
            const bucket = buckets[0];
            context.BUCKETS[bucketName] = bucket.json;
            inputVersions[bucketName] = bucket.version;
          }
        }

        await supabase
          .from('runs')
          .update({ input_bucket_versions: inputVersions })
          .eq('id', runId);
      }

      const executionResult = await executeScript(script.ts_code, context);

      const finishedAt = new Date().toISOString();
      const logs = executionResult.logs.join('\n');

      if (executionResult.success && executionResult.output) {
        const { data: existingBuckets } = await supabase
          .from('buckets')
          .select('version')
          .eq('name', script.output_bucket_name)
          .order('version', { ascending: false })
          .limit(1);

        const nextVersion = existingBuckets && existingBuckets.length > 0
          ? existingBuckets[0].version + 1
          : 1;

        await supabase.from('buckets').insert({
          name: script.output_bucket_name,
          version: nextVersion,
          json: executionResult.output,
          run_id: runId,
        });

        await supabase
          .from('runs')
          .update({
            finished_at: finishedAt,
            status: 'success',
            logs,
            output_bucket_name: script.output_bucket_name,
            output_bucket_version: nextVersion,
          })
          .eq('id', runId);
      } else {
        await supabase
          .from('runs')
          .update({
            finished_at: finishedAt,
            status: 'failed',
            logs: logs || executionResult.error || 'Unknown error',
          })
          .eq('id', runId);
      }

      const nextRunAt = new Date(Date.now() + schedule.interval_hours * 60 * 60 * 1000).toISOString();

      await supabase
        .from('script_schedules')
        .update({
          last_run_at: startedAt,
          next_run_at: nextRunAt,
        })
        .eq('id', schedule.id);

      results.push({
        schedule_id: schedule.id,
        script_name: script.name,
        run_id: runId,
        status: executionResult.success ? 'success' : 'failed',
      });
    }

    return NextResponse.json({
      message: 'Cron execution completed',
      executed: results.length,
      results
    });
  } catch (error: any) {
    console.error('Cron execution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
