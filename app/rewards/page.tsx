import { AccessGate } from "@/app/components/AccessGate";
import { RewardsApp } from "./RewardsApp";

export default function RewardsPage() {
  return (
    <AccessGate>
      <RewardsApp />
    </AccessGate>
  );
}
