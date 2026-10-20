import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ConfirmPanelProps = {
  title: string;
  /** The explanation: what will happen, and whether it can be undone. */
  children: ReactNode;
  confirmLabel: string;
  keepLabel: string;
  /** Red confirm button, for things like cancelling and refunding. */
  destructive?: boolean;
  loading: boolean;
  /** What went wrong the last time, shown above the buttons. */
  error: string | null;
  onConfirm: () => void;
  onKeep: () => void;
};

/** An "are you sure?" box in the page itself, for actions that cannot be undone. No pop-up to trap focus in. */
export function ConfirmPanel({
  title,
  children,
  confirmLabel,
  keepLabel,
  destructive,
  loading,
  error,
  onConfirm,
  onKeep,
}: ConfirmPanelProps) {
  return (
    <div role="group" aria-label={title} className="grid gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2.5">
        <Button variant={destructive ? "destructive" : "default"} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="outline" disabled={loading} onClick={onKeep}>
          {keepLabel}
        </Button>
      </div>
    </div>
  );
}