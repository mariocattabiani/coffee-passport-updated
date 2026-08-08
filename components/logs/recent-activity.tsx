"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LogCard, type LogCardData } from "@/components/logs/log-card";
import { FirstLogEmptyState } from "@/components/dashboard/first-log-empty-state";

export function RecentActivity({ initialLogs }: { initialLogs: LogCardData[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const router = useRouter();

  function handleDeleted(logId: string) {
    // The card disappears the moment the server confirms the delete,
    // no page-wide re-render required for that part. The stat tiles
    // above still need fresh numbers, so a refresh happens too, it
    // just doesn't block the card from vanishing first.
    setLogs((prev) => prev.filter((log) => log.id !== logId));
    router.refresh();
  }

  if (logs.length === 0) {
    return <FirstLogEmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {logs.map((log) => (
        <LogCard key={log.id} log={log} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
