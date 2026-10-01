import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  hint,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    destructive: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneClasses)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
