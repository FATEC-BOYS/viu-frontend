import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="h-5 w-2/3 bg-muted rounded" />
        <div className="mt-2 h-4 w-1/3 bg-muted rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 w-full bg-muted rounded" />
        <div className="h-2 w-2/3 bg-muted rounded" />
        <div className="h-8 w-full bg-muted rounded" />
      </CardContent>
    </Card>
  );
}
