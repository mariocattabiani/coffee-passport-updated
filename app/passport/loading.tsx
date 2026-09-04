import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton rows={3} rowHeight="lg" maxWidth="max-w-5xl" />;
}
