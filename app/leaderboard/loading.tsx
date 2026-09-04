import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton rows={8} rowHeight="sm" maxWidth="max-w-2xl" />;
}
