import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BASE_URL, getBaseURL, setBaseURL } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const [url, setUrl] = useState(getBaseURL());

  useEffect(() => {
    if (open) setUrl(getBaseURL());
  }, [open]);

  const save = () => {
    const trimmed = url.trim().replace(/\/$/, "");
    setBaseURL(trimmed || DEFAULT_BASE_URL);
    toast.success("Backend URL saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel border-border">
        <DialogHeader>
          <DialogTitle>Backend Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="baseURL">Backend base URL</Label>
          <Input
            id="baseURL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={DEFAULT_BASE_URL}
          />
          <p className="text-xs text-muted-foreground">
            The Flask server hosting <code className="font-mono">/api/auth</code>,{" "}
            <code className="font-mono">/api/fs</code>, and{" "}
            <code className="font-mono">/api/compile</code>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
