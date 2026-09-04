import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton rows={6} rowHeight="md" maxWidth="max-w-3xl" />;
}
