'use server';

import { getSupabaseServer } from './supabase-server';
import { executeScript } from './script-executor';
import { LibraryItem, Bucket, ScriptDefinition, Run } from './types';

export async function runScript(scriptName: string): Promise<{
  success: boolean;
  runId?: string;
  error?: string;
}> {
  try {
    const supabase = getSupabaseServer();
    const { data: script, error: scriptError } = await supabase
      .from('script_definitions')
      .select('*')
      .eq('name', scriptName)
      .maybeSingle();

    if (scriptError || !script) {
      return { success: false, error: 'Script not found' };
    }

    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    await supabase.from('runs').insert({
      id: runId,
      script_name: scriptName,
      started_at: startedAt,
      status: 'failed',
      logs: 'Starting execution...',
    });

    let LIBRARY: Record<string, any> = {};
    let BUCKETS: Record<string, any> = {};
    const inputBucketVersions: Record<string, number> = {};

    if (script.read_library) {
      const { data: libraryItems } = await supabase
        .from('library_items')
        .select('*');

      if (libraryItems) {
        LIBRARY = libraryItems.reduce((acc, item) => {
          acc[item.sku] = item.json;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    const inputBucketNames = script.input_bucket_names as string[];
    if (inputBucketNames && inputBucketNames.length > 0) {
      for (const bucketName of inputBucketNames) {
        const { data: latestBucket } = await supabase
          .from('buckets')
          .select('*')
          .eq('name', bucketName)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestBucket) {
          BUCKETS[bucketName] = latestBucket.json;
          inputBucketVersions[bucketName] = latestBucket.version;
        }
      }
    }

    const executionResult = await executeScript(
      script.ts_code,
      { LIBRARY, BUCKETS }
    );

    if (!executionResult.success) {
      await supabase
        .from('runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'failed',
          logs: executionResult.logs.join('\\n'),
          input_bucket_versions: inputBucketVersions,
        })
        .eq('id', runId);

      return {
        success: false,
        error: executionResult.error,
        runId,
      };
    }

    const { data: existingBuckets } = await supabase
      .from('buckets')
      .select('version')
      .eq('name', script.output_bucket_name)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingBuckets && existingBuckets.length > 0
      ? existingBuckets[0].version + 1
      : 1;

    const { error: bucketError } = await supabase
      .from('buckets')
      .insert({
        name: script.output_bucket_name,
        version: nextVersion,
        json: executionResult.output,
        run_id: runId,
      });

    if (bucketError) {
      throw new Error(`Failed to save bucket: ${bucketError.message}`);
    }

    await supabase
      .from('runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'success',
        logs: executionResult.logs.join('\\n'),
        input_bucket_versions: inputBucketVersions,
        output_bucket_name: script.output_bucket_name,
        output_bucket_version: nextVersion,
      })
      .eq('id', runId);

    return { success: true, runId };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
