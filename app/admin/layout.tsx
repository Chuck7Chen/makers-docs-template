import type { ReactNode } from "react";
import { PlatformHeader } from "@/components/platform-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-muted/40">
        <PlatformHeader admin />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
