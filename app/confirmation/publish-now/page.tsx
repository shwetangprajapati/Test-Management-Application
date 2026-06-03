"use client";

import { Suspense } from "react";
import { PublishNowScreen } from "@/app/screens/publish";

export default function PublishNowPage() {
  return (
    <Suspense>
      <PublishNowScreen />
    </Suspense>
  );
}
