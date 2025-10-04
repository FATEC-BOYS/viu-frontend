"use client";

import SkeletonList from "@/components/commom/SkeletonList";

export default function AtividadeSkeleton() {
  return (
    <div className="border rounded-xl p-4">
      <SkeletonList rows={6} avatar lines={1} />
    </div>
  );
}
