import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const [maxTables, setMaxTables] = useState("20");

  useEffect(() => {
    if (settings) setMaxTables(String(settings.maxTables));
  }, [settings]);

  const handleSave = () => {
    const parsed = Number(maxTables);
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast({ title: "Enter a valid number of tables (1 or more)", variant: "destructive" });
      return;
    }

    updateSettings.mutate(
      { data: { maxTables: parsed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings saved" });
        },
        onError: (err) => {
          toast({
            title: "Failed to save settings",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex h-full flex-col w-full bg-muted/30">
      <header className="flex-none p-4 sm:p-6 bg-background border-b-2 border-border/50 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Admin Settings
        </h1>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-lg bg-background border-2 border-border/50 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold mb-1">Table Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Set the number of tables available in the restaurant. The Take Order page's table dropdown
              will automatically show Table 1 through Table N, plus Take Away.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Maximum Number of Tables (N)</Label>
            <Input
              type="number"
              min={1}
              value={isLoading ? "" : maxTables}
              onChange={(e) => setMaxTables(e.target.value)}
              disabled={isLoading}
              className="max-w-[200px] font-mono text-lg font-bold"
            />
          </div>

          <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading} size="lg">
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
