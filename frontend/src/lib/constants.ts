import type { BookStatus } from "@/types/api";

export const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "買いたい/読みたい",
  unread: "所有/未読",
  reading: "読書中",
  suspended: "中断",
  finished: "読了",
};

export const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: "want_to_read", label: "買いたい/読みたい" },
  { value: "unread", label: "所有/未読" },
  { value: "reading", label: "読書中" },
  { value: "finished", label: "読了" },

];
