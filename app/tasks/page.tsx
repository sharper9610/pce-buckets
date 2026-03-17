"use client";

import { useEffect, useState } from "react";
import { Table } from "@/components/Table";
import { JsonDrawer } from "@/components/JsonDrawer";
import { Badge } from "@/components/ui/badge";
import { CircleAlert as AlertCircle } from "lucide-react";

interface Task {
  task_id: string;
  sku: string;
  type: string;
  priority: string;
  owner?: string;
  summary: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fileExists, setFileExists] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch("/buckets/tasks.json");
        if (!res.ok) {
          setFileExists(false);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTasks(data);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        setFileExists(false);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase();
    if (p === "high" || p === "critical") return "bg-red-600";
    if (p === "medium") return "bg-orange-600";
    return "bg-blue-600";
  };

  const columns = [
    { key: "task_id", header: "Task ID" },
    { key: "sku", header: "SKU" },
    { key: "type", header: "Type" },
    {
      key: "priority",
      header: "Priority",
      render: (value: string) => (
        <Badge className={getPriorityColor(value)}>
          {value || "Normal"}
        </Badge>
      ),
    },
    { key: "owner", header: "Owner" },
    {
      key: "summary",
      header: "Summary",
      render: (value: string) => (
        <div className="max-w-md truncate">{value || "-"}</div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  if (!fileExists) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            GPT-generated action items and recommendations
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No GPT tasks generated yet</h3>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            Tasks will appear here once the GPT task generation script has been
            run on your buckets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          GPT-generated action items and recommendations
        </p>
      </div>

      <div className="text-sm text-muted-foreground">{tasks.length} tasks</div>

      <Table
        columns={columns}
        data={tasks}
        onRowClick={(row) => setSelectedTask(row)}
      />

      <JsonDrawer
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={`Task: ${selectedTask?.task_id || ""}`}
        data={selectedTask}
      />
    </div>
  );
}
