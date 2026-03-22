import { AppShell } from "@/components/AppShell";
import { TradesProvider } from "@/hooks/useTrades";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TradesProvider>
      <AppShell>{children}</AppShell>
    </TradesProvider>
  );
}
