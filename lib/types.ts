export interface LibraryItem {
  sku: string;
  title?: string;
  json: any;
  raw_json?: string;
  updated_at: string;
}

export interface Bucket {
  id: string;
  name: string;
  version: number;
  json: any;
  generated_at: string;
  run_id?: string;
}

export interface ScriptDefinition {
  id: string;
  name: string;
  description: string;
  ts_code: string;
  read_library: boolean;
  input_bucket_names: string[];
  output_bucket_name: string;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  script_name: string;
  started_at: string;
  finished_at?: string;
  status: 'success' | 'failed';
  logs: string;
  input_bucket_versions: Record<string, number>;
  output_bucket_name?: string;
  output_bucket_version?: number;
}

export interface ScriptSchedule {
  id: string;
  script_definition_id: string;
  interval_hours: number;
  enabled: boolean;
  last_run_at?: string;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptContext {
  LIBRARY?: Record<string, any>;
  BUCKETS?: Record<string, any>;
}

export type ScriptFunction = (context: ScriptContext) => Record<string, any>;
