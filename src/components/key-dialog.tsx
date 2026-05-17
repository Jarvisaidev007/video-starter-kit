"use client";

import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type KeyDialogProps = {} & Parameters<typeof Dialog>[0];

export function KeyDialog({ onOpenChange, open, ...props }: KeyDialogProps) {
  const [falKey, setFalKey] = useState(
    () =>
      (typeof localStorage !== "undefined" && localStorage.getItem("falKey")) ||
      "",
  );
  const [elevenLabsKey, setElevenLabsKey] = useState(
    () =>
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("elevenLabsKey")) ||
      "",
  );

  const handleOnOpenChange = (isOpen: boolean) => {
    onOpenChange?.(isOpen);
  };

  const handleSave = () => {
    if (falKey) localStorage.setItem("falKey", falKey);
    if (elevenLabsKey) localStorage.setItem("elevenLabsKey", elevenLabsKey);
    handleOnOpenChange(false);
  };

  return (
    <Dialog {...props} onOpenChange={handleOnOpenChange} open={open}>
      <DialogContent className="flex flex-col max-w-lg h-fit">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 gap-6">
          <div className="flex flex-col gap-2">
            <Label>fal.ai Key</Label>
            <Input
              placeholder="Your FAL Key"
              type="password"
              value={falKey}
              onChange={(e) => setFalKey(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Get yours at{" "}
              <a
                className="underline underline-offset-2 text-foreground"
                href="https://fal.ai/dashboard/keys"
                target="_blank"
              >
                fal.ai/dashboard/keys
              </a>
              . Powers image, video, music, and voiceover generation.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>
              ElevenLabs Key{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              placeholder="Your ElevenLabs Key"
              type="password"
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Get yours at{" "}
              <a
                className="underline underline-offset-2 text-foreground"
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
              >
                elevenlabs.io
              </a>
              . Enables ElevenLabs v3 voiceover.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="w-full">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
