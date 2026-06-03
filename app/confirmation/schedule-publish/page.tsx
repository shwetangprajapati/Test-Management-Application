"use client";

import { Suspense } from "react";
import { SchedulePublishScreen } from "@/app/screens/publish";

export default function SchedulePublishPage() {
  return (
    <Suspense>
      <SchedulePublishScreen />
    </Suspense>
  );
}
