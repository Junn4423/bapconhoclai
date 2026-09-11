"use client";

import { AccessGate } from "@/app/components/AccessGate";
import { ExamApp } from "@/app/ExamApp";

export default function Page() {
  return (
    <AccessGate>
      <ExamApp />
    </AccessGate>
  );
}
