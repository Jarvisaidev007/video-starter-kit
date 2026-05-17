"use client";

import { useJobCreator } from "@/data/mutations";
import { queryKeys, useProject, useProjectMediaItems } from "@/data/queries";
import type { MediaItem } from "@/data/schema";
import {
  type GenerateData,
  type MediaType,
  useProjectId,
  useVideoProjectStore,
} from "@/data/store";
import {
  AVAILABLE_ENDPOINTS,
  type InputAsset,
  type ModelParam,
} from "@/lib/fal";
import {
  ImageIcon,
  MicIcon,
  MusicIcon,
  LoaderCircleIcon,
  VideoIcon,
  ArrowLeft,
  TrashIcon,
  WandSparklesIcon,
  CrossIcon,
  XIcon,
} from "lucide-react";
import { MediaItemRow } from "./media-panel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

import { useEffect, useMemo, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import type { ClientUploadedFileData } from "uploadthing/types";
import { db } from "@/data/db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  assetKeyMap,
  cn,
  getAssetKey,
  getAssetType,
  mapInputKey,
  resolveMediaUrl,
} from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { enhancePrompt } from "@/lib/prompt";
import { WithTooltip } from "./ui/tooltip";
import { Label } from "./ui/label";
import { VoiceSelector } from "./playht/voice-selector";
import { LoadingIcon } from "./ui/icons";
import { getMediaMetadata } from "@/lib/ffmpeg";
import CameraMovement from "./camera-control";
import VideoFrameSelector from "./video-frame-selector";

type ModelEndpointPickerProps = {
  mediaType: string;
  onValueChange: (value: MediaType) => void;
} & Parameters<typeof Select>[0];

function ModelEndpointPicker({
  mediaType,
  ...props
}: ModelEndpointPickerProps) {
  const endpoints = useMemo(
    () =>
      AVAILABLE_ENDPOINTS.filter((endpoint) => endpoint.category === mediaType),
    [mediaType],
  );
  return (
    <Select {...props}>
      <SelectTrigger className="text-base w-full minw-56 font-semibold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {endpoints.map((endpoint) => (
          <SelectItem key={endpoint.endpointId} value={endpoint.endpointId}>
            <div className="flex flex-row gap-2 items-center">
              <span>{endpoint.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function RightPanel({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void;
}) {
  const videoProjectStore = useVideoProjectStore((s) => s);
  const {
    generateData,
    setGenerateData,
    resetGenerateData,
    endpointId,
    setEndpointId,
  } = videoProjectStore;

  const [tab, setTab] = useState<string>("generation");
  const [assetMediaType, setAssetMediaType] = useState("all");
  const projectId = useProjectId();
  const openGenerateDialog = useVideoProjectStore((s) => s.openGenerateDialog);
  const generateDialogOpen = useVideoProjectStore((s) => s.generateDialogOpen);
  const closeGenerateDialog = useVideoProjectStore(
    (s) => s.closeGenerateDialog,
  );
  const queryClient = useQueryClient();

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      closeGenerateDialog();
      resetGenerateData();
      return;
    }
    onOpenChange?.(isOpen);
    openGenerateDialog();
  };

  const { data: project } = useProject(projectId);

  const { toast } = useToast();
  const enhance = useMutation({
    mutationFn: async () => {
      return enhancePrompt(generateData.prompt, {
        type: mediaType,
        project,
      });
    },
    onSuccess: (enhancedPrompt) => {
      setGenerateData({ prompt: enhancedPrompt });
    },
    onError: (error) => {
      console.warn("Failed to create suggestion", error);
      toast({
        title: "Failed to enhance prompt",
        description: "There was an unexpected error. Try again.",
      });
    },
  });

  const { data: mediaItems = [] } = useProjectMediaItems(projectId);
  const mediaType = useVideoProjectStore((s) => s.generateMediaType);
  const setMediaType = useVideoProjectStore((s) => s.setGenerateMediaType);

  const endpoint = useMemo(
    () =>
      AVAILABLE_ENDPOINTS.find(
        (endpoint) => endpoint.endpointId === endpointId,
      ),
    [endpointId],
  );
  const handleMediaTypeChange = (mediaType: string) => {
    setMediaType(mediaType as MediaType);
    const endpoint = AVAILABLE_ENDPOINTS.find(
      (endpoint) => endpoint.category === mediaType,
    );

    const initialInput = endpoint?.initialInput || {};

    if (mediaType !== "video") {
      setGenerateData({ image: null, ...initialInput });
    } else {
      setGenerateData({ ...initialInput });
    }

    setEndpointId(endpoint?.endpointId ?? AVAILABLE_ENDPOINTS[0].endpointId);
  };
  // Build model param values from generateData (with defaults)
  const paramValues = useMemo(() => {
    const values: Record<string, any> = {};
    for (const param of endpoint?.params ?? []) {
      values[param.key] = generateData[param.key] ?? param.default;
    }
    return values;
  }, [endpoint?.params, generateData]);

  // Detect if an image-type asset is set (works for both "image" and custom keys like "start_image_url")
  const hasImageRef = useMemo(() => {
    return (
      endpoint?.inputAsset?.some(
        (a) => getAssetType(a) === "image" && !!generateData[getAssetKey(a)],
      ) ?? false
    );
  }, [endpoint?.inputAsset, generateData]);

  const input = useMemo(() => {
    const base: Record<string, any> = {
      prompt: generateData.prompt,
    };

    // Voice-specific
    if (endpointId === "fal-ai/playht/tts/v3") {
      base.voice = generateData.voice;
      base.input = generateData.prompt;
    }

    // Copy all asset values from generateData using the correct keys
    for (const asset of endpoint?.inputAsset ?? []) {
      const key = getAssetKey(asset);
      if (generateData[key]) {
        base[key] = generateData[key];
      }
    }

    if (generateData.advanced_camera_control)
      base.advanced_camera_control = generateData.advanced_camera_control;
    if (generateData.images) base.images = generateData.images;

    // Spread model-specific params
    Object.assign(base, paramValues);

    return base;
  }, [generateData, endpointId, endpoint?.inputAsset, paramValues]);

  const extraInput =
    endpointId === "fal-ai/f5-tts"
      ? {
          gen_text: generateData.prompt,
          ref_audio_url:
            "https://github.com/SWivid/F5-TTS/raw/21900ba97d5020a5a70bcc9a0575dc7dec5021cb/tests/ref_audio/test_en_1_ref_short.wav",
          ref_text: "Some call me nature, others call me mother nature.",
          model_type: "F5-TTS",
          remove_silence: true,
        }
      : {};

  const resolvedEndpointId = useMemo(() => {
    if (hasImageRef && mediaType === "video") {
      return endpoint?.imageToVideoEndpointId ?? `${endpointId}/image-to-video`;
    }
    if (hasImageRef && mediaType === "image" && endpoint?.imageEditEndpointId) {
      return endpoint.imageEditEndpointId;
    }
    return endpointId;
  }, [hasImageRef, mediaType, endpoint, endpointId]);

  const resolvedInput = useMemo(() => {
    const mapped = mapInputKey(input, endpoint?.inputMap || {});
    // GPT Image 2 edit expects image_urls array
    if (
      hasImageRef &&
      mediaType === "image" &&
      endpoint?.imageInputKey === "image_urls"
    ) {
      const { image_url, ...rest } = mapped;
      const imgAsset = endpoint?.inputAsset?.find(
        (a) => getAssetType(a) === "image",
      );
      const imgKey = imgAsset ? getAssetKey(imgAsset) : "image";
      return {
        ...(endpoint?.initialInput || {}),
        ...rest,
        image_urls: [generateData[imgKey]],
        ...extraInput,
      };
    }
    return {
      ...(endpoint?.initialInput || {}),
      ...mapped,
      ...extraInput,
    };
  }, [input, endpoint, hasImageRef, mediaType, extraInput, generateData]);

  const createJob = useJobCreator();

  const handleOnGenerate = async () => {
    await createJob.mutateAsync(
      {
        projectId,
        endpointId: resolvedEndpointId,
        mediaType,
        input: resolvedInput,
      },
      {
        onSuccess: async () => {
          if (!createJob.isError) {
            handleOnOpenChange(false);
          }
        },
        onError: (error) => {
          console.warn("Failed to create job", error);
          toast({
            title: "Failed to generate media",
            description:
              "Please ensure you've set your FAL KEY in the settings.",
          });
        },
      },
    );
  };

  useEffect(() => {
    videoProjectStore.onGenerate = handleOnGenerate;
  }, [handleOnGenerate]);

  const handleSelectMedia = (media: MediaItem) => {
    const asset = endpoint?.inputAsset?.find((item) => {
      const assetType = getAssetType(item);

      if (
        assetType === "audio" &&
        (media.mediaType === "voiceover" || media.mediaType === "music")
      ) {
        return true;
      }
      return assetType === media.mediaType;
    });

    if (!asset) {
      setTab("generation");
      return;
    }

    setGenerateData({ [getAssetKey(asset)]: resolveMediaUrl(media) });
    setTab("generation");
  };

  const { startUpload, isUploading } = useUploadThing("fileUploader");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const uploadedFiles = await startUpload(Array.from(files));
      if (uploadedFiles) {
        await handleUploadComplete(uploadedFiles);
      }
    } catch (err) {
      console.warn(`ERROR! ${err}`);
      toast({
        title: "Failed to upload file",
        description: "Please try again",
      });
    }
  };

  const handleUploadComplete = async (
    files: ClientUploadedFileData<{
      uploadedBy: string;
    }>[],
  ) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaType = file.type.split("/")[0];
      const outputType = mediaType === "audio" ? "music" : mediaType;

      const data: Omit<MediaItem, "id"> = {
        projectId,
        kind: "uploaded",
        createdAt: Date.now(),
        mediaType: outputType as MediaType,
        status: "completed",
        url: file.url,
      };

      setGenerateData({
        ...generateData,
        [assetKeyMap[outputType as keyof typeof assetKeyMap]]: file.url,
      });

      const mediaId = await db.media.create(data);
      const media = await db.media.find(mediaId as string);

      if (media && media.mediaType !== "image") {
        const mediaMetadata = await getMediaMetadata(media as MediaItem);

        await db.media
          .update(media.id, {
            ...media,
            metadata: mediaMetadata?.media || {},
          })
          .finally(() => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.projectMediaItems(projectId),
            });
          });
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border-l border-border w-[450px] z-50 transition-all duration-300 absolute top-0 h-full bg-background",
        generateDialogOpen ? "right-0" : "-right-[450px]",
      )}
    >
      <div className="flex-1 flex flex-col border-b border-border h-full overflow-hidden relative">
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-row items-center justify-between">
            <h2 className="text-sm text-muted-foreground font-semibold flex-1">
              Generate Media
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOnOpenChange(false)}
              className="flex items-center gap-2"
            >
              <XIcon className="w-6 h-6" />
            </Button>
          </div>
          <div className="w-full flex flex-col">
            <div className="flex w-full gap-2">
              <Button
                variant="ghost"
                onClick={() => handleMediaTypeChange("image")}
                className={cn(
                  mediaType === "image" && "bg-white/10",
                  "h-14 flex flex-col justify-center w-1/4 rounded-md gap-2 items-center",
                )}
              >
                <ImageIcon className="w-4 h-4 opacity-50" />
                <span className="text-[10px]">Image</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleMediaTypeChange("video")}
                className={cn(
                  mediaType === "video" && "bg-white/10",
                  "h-14 flex flex-col justify-center w-1/4 rounded-md gap-2 items-center",
                )}
              >
                <VideoIcon className="w-4 h-4 opacity-50" />
                <span className="text-[10px]">Video</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleMediaTypeChange("voiceover")}
                className={cn(
                  mediaType === "voiceover" && "bg-white/10",
                  "h-14 flex flex-col justify-center w-1/4 rounded-md gap-2 items-center",
                )}
              >
                <MicIcon className="w-4 h-4 opacity-50" />
                <span className="text-[10px]">Voiceover</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleMediaTypeChange("music")}
                className={cn(
                  mediaType === "music" && "bg-white/10",
                  "h-14 flex flex-col justify-center w-1/4 rounded-md gap-2 items-center",
                )}
              >
                <MusicIcon className="w-4 h-4 opacity-50" />
                <span className="text-[10px]">Music</span>
              </Button>
            </div>
            <div className="flex flex-col gap-2 mt-2 justify-start font-medium text-base">
              <div className="text-muted-foreground">Using</div>
              <ModelEndpointPicker
                mediaType={mediaType}
                value={endpointId}
                onValueChange={(newEndpointId) => {
                  const prev = {
                    prompt: generateData.prompt,
                    image: generateData.image,
                    video_url: generateData.video_url,
                    audio_url: generateData.audio_url,
                  };
                  resetGenerateData();
                  setEndpointId(newEndpointId);

                  const ep = AVAILABLE_ENDPOINTS.find(
                    (e) => e.endpointId === newEndpointId,
                  );

                  const initialInput = ep?.initialInput || {};
                  setGenerateData({ ...initialInput, ...prev });
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 relative">
            {endpoint?.inputAsset?.map((asset, index) => (
              <div key={getAssetType(asset)} className="flex w-full">
                <div className="flex flex-col w-full" key={getAssetType(asset)}>
                  <div className="flex justify-between">
                    <h4 className="capitalize text-muted-foreground mb-2">
                      {getAssetType(asset)} Reference
                    </h4>
                    {tab === `asset-${getAssetType(asset)}` && (
                      <Button
                        variant="ghost"
                        onClick={() => setTab("generation")}
                        size="sm"
                      >
                        <ArrowLeft /> Back
                      </Button>
                    )}
                  </div>
                  {(tab === "generation" ||
                    tab !== `asset-${getAssetType(asset)}`) && (
                    <>
                      {!generateData[getAssetKey(asset)] && (
                        <div className="flex flex-col gap-2 justify-between">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setTab(`asset-${getAssetType(asset)}`);
                              setAssetMediaType(getAssetType(asset) ?? "all");
                            }}
                            className="cursor-pointer min-h-[30px] flex flex-col items-center justify-center border border-dashed border-border rounded-md px-4"
                          >
                            <span className="text-muted-foreground text-xs text-center text-nowrap">
                              Select
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isUploading}
                            className="cursor-pointer min-h-[30px] flex flex-col items-center justify-center border border-dashed border-border rounded-md px-4"
                            asChild
                          >
                            <label htmlFor="assetUploadButton">
                              <Input
                                id="assetUploadButton"
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                multiple={false}
                                disabled={isUploading}
                                accept="image/*,audio/*,video/*"
                              />
                              {isUploading ? (
                                <LoaderCircleIcon className="w-4 h-4 opacity-50 animate-spin" />
                              ) : (
                                <span className="text-muted-foreground text-xs text-center text-nowrap">
                                  Upload
                                </span>
                              )}
                            </label>
                          </Button>
                        </div>
                      )}
                      {generateData[getAssetKey(asset)] && (
                        <div className="flex items-center gap-2 w-full border border-dashed border-border rounded-md p-2">
                          <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-accent">
                            <SelectedAssetPreview
                              asset={asset}
                              data={generateData}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground truncate flex-1">
                            {getAssetType(asset)} reference
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-accent text-muted-foreground shrink-0"
                            onClick={() =>
                              setGenerateData({
                                [getAssetKey(asset)]: undefined,
                              })
                            }
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {tab === `asset-${getAssetType(asset)}` && (
                    <div className="flex items-center gap-2 flex-wrap overflow-y-auto max-h-80 divide-y divide-border">
                      {mediaItems
                        .filter((media) => {
                          if (assetMediaType === "all") return true;
                          if (
                            assetMediaType === "audio" &&
                            (media.mediaType === "voiceover" ||
                              media.mediaType === "music")
                          )
                            return true;
                          return media.mediaType === assetMediaType;
                        })
                        .map((job) => (
                          <MediaItemRow
                            draggable={false}
                            key={job.id}
                            data={job}
                            onOpen={handleSelectMedia}
                            className="cursor-pointer"
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {endpoint?.prompt !== false && (
              <div className="relative bg-border rounded-lg pb-10 placeholder:text-base w-full  resize-none">
                <Textarea
                  className="text-base shadow-none focus:!ring-0 placeholder:text-base w-full h-32 resize-none"
                  placeholder="Imagine..."
                  value={generateData.prompt}
                  rows={3}
                  onChange={(e) => setGenerateData({ prompt: e.target.value })}
                />
                <WithTooltip tooltip="Enhance your prompt with AI-powered suggestions.">
                  <div className="absolute bottom-2 right-2">
                    <Button
                      variant="secondary"
                      disabled={enhance.isPending}
                      className="bg-purple-400/10 text-purple-400 text-xs rounded-full h-6 px-3"
                      onClick={() => enhance.mutate()}
                    >
                      {enhance.isPending ? (
                        <LoadingIcon />
                      ) : (
                        <WandSparklesIcon className="opacity-50" />
                      )}
                      Enhance Prompt
                    </Button>
                  </div>
                </WithTooltip>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 mb-2">
            {endpoint?.imageForFrame && (
              <VideoFrameSelector
                mediaItems={mediaItems}
                onChange={(
                  images: {
                    start_frame_num: number;
                    image_url: string | File;
                  }[],
                ) => setGenerateData({ images })}
              />
            )}
            {endpoint?.cameraControl && (
              <CameraMovement
                value={generateData.advanced_camera_control}
                onChange={(val) =>
                  setGenerateData({
                    advanced_camera_control: val
                      ? {
                          movement_value: val.value,
                          movement_type: val.movement,
                        }
                      : undefined,
                  })
                }
              />
            )}
            {/* Dynamic model params */}
            {endpoint?.params && endpoint.params.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {endpoint.params.map((param) => (
                  <ModelParamControl
                    key={param.key}
                    param={param}
                    value={paramValues[param.key]}
                    onChange={(val) => setGenerateData({ [param.key]: val })}
                  />
                ))}
              </div>
            )}
            {mediaType === "music" && (
              <div className="flex flex-row items-center gap-1">
                <Label>Duration</Label>
                <Input
                  className="w-12 text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={5}
                  max={30}
                  step={1}
                  type="number"
                  value={generateData.duration}
                  onChange={(e) =>
                    setGenerateData({
                      duration: Number.parseInt(e.target.value),
                    })
                  }
                />
                <span>s</span>
              </div>
            )}
            {endpointId === "fal-ai/playht/tts/v3" && (
              <VoiceSelector
                value={generateData.voice}
                onValueChange={(voice) => {
                  setGenerateData({ voice });
                }}
              />
            )}
          </div>
        </div>
        <div className="shrink-0 p-4 pt-2 border-t border-border">
          <Button
            className="w-full"
            disabled={enhance.isPending || createJob.isPending}
            onClick={handleOnGenerate}
          >
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

const SelectedAssetPreview = ({
  data,
  asset,
}: {
  data: GenerateData;
  asset: InputAsset;
}) => {
  const assetType = getAssetType(asset);
  const assetKey = getAssetKey(asset);

  if (!data[assetKey]) return null;

  return (
    <>
      {assetType === "audio" && (
        <audio
          src={
            data[assetKey] && typeof data[assetKey] !== "string"
              ? URL.createObjectURL(data[assetKey])
              : data[assetKey] || ""
          }
          controls={true}
        />
      )}
      {assetType === "video" && (
        <video
          src={
            data[assetKey] && typeof data[assetKey] !== "string"
              ? URL.createObjectURL(data[assetKey])
              : data[assetKey] || ""
          }
          controls={false}
          className="w-full h-full object-cover"
          style={{ pointerEvents: "none" }}
        />
      )}
      {assetType === "image" && (
        <img
          src={
            data[assetKey] && typeof data[assetKey] !== "string"
              ? URL.createObjectURL(data[assetKey])
              : data[assetKey] || ""
          }
          alt="Media Preview"
          className="w-full h-full object-cover"
        />
      )}
    </>
  );
};

function ModelParamControl({
  param,
  value,
  onChange,
}: {
  param: ModelParam;
  value: any;
  onChange: (value: any) => void;
}) {
  if (param.type === "select" && param.options) {
    return (
      <div className="flex flex-col gap-1 min-w-[100px] flex-1">
        <Label className="text-xs text-muted-foreground">{param.label}</Label>
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (param.type === "toggle") {
    return (
      <div className="flex flex-col gap-1 min-w-[100px] flex-1">
        <Label className="text-xs text-muted-foreground">{param.label}</Label>
        <Button
          variant={value ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange(!value)}
        >
          {value ? "On" : "Off"}
        </Button>
      </div>
    );
  }

  return null;
}
