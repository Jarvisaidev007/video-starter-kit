import { fal } from "@/lib/fal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "./db";
import { queryKeys } from "./queries";
import type { VideoProject } from "./schema";

export const useProjectUpdater = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: Partial<VideoProject>) =>
      db.projects.update(projectId, project),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
};

export const useProjectCreator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: Omit<VideoProject, "id">) =>
      db.projects.create(project),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

export type JobCreatorVariables = {
  projectId: string;
  endpointId: string;
  mediaType: "video" | "image" | "voiceover" | "music";
  input: Record<string, any>;
};

function isElevenLabsDirect(endpointId: string) {
  return endpointId === "elevenlabs/tts/v3";
}

export const useJobCreator = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: JobCreatorVariables) => {
      if (isElevenLabsDirect(vars.endpointId)) {
        const elevenLabsKey = localStorage?.getItem("elevenLabsKey") || "";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (elevenLabsKey) headers["x-elevenlabs-key"] = elevenLabsKey;
        const response = await fetch("/api/elevenlabs/tts", {
          method: "POST",
          headers,
          body: JSON.stringify(vars.input),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "ElevenLabs request failed");
        }
        const audioBlob = await response.blob();
        const file = new File([audioBlob], "speech.mp3", {
          type: "audio/mpeg",
        });
        const url = await fal.storage.upload(file);
        return { request_id: crypto.randomUUID(), _directUrl: url };
      }
      return fal.queue.submit(vars.endpointId, { input: vars.input });
    },
    onSuccess: async (data: any, vars: JobCreatorVariables) => {
      if (data._directUrl) {
        await db.media.create({
          projectId: vars.projectId,
          createdAt: Date.now(),
          mediaType: vars.mediaType,
          kind: "generated",
          endpointId: vars.endpointId,
          requestId: data.request_id,
          status: "completed",
          input: vars.input,
          output: { audio: { url: data._directUrl } },
        });
      } else {
        await db.media.create({
          projectId: vars.projectId,
          createdAt: Date.now(),
          mediaType: vars.mediaType,
          kind: "generated",
          endpointId: vars.endpointId,
          requestId: data.request_id,
          status: "pending",
          input: vars.input,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(vars.projectId),
      });
    },
  });
};
