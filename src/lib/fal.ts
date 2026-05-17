"use client";

import { createFalClient } from "@fal-ai/client";

export const fal = createFalClient({
  credentials: () => localStorage?.getItem("falKey") || undefined,
  proxyUrl: "/api/fal",
});

export type InputAsset =
  | "video"
  | "image"
  | "audio"
  | {
      type: "video" | "image" | "audio";
      key: string;
    };

export type ModelParam = {
  key: string;
  label: string;
  type: "select" | "toggle";
  options?: { value: string; label: string }[];
  default: any;
};

export type ApiInfo = {
  endpointId: string;
  label: string;
  description: string;
  cost: string;
  inferenceTime?: string;
  inputMap?: Record<string, string>;
  inputAsset?: InputAsset[];
  initialInput?: Record<string, unknown>;
  cameraControl?: boolean;
  imageForFrame?: boolean;
  category: "image" | "video" | "music" | "voiceover";
  prompt?: boolean;
  imageToVideoEndpointId?: string;
  imageEditEndpointId?: string;
  imageInputKey?: string;
  params?: ModelParam[];
};

// ── Reusable param definitions ──

const videoDurationSeedance: ModelParam = {
  key: "duration",
  label: "Duration",
  type: "select",
  options: [
    { value: "auto", label: "Auto" },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 4),
      label: `${i + 4}s`,
    })),
  ],
  default: "auto",
};

const videoResolution3: ModelParam = {
  key: "resolution",
  label: "Resolution",
  type: "select",
  options: [
    { value: "480p", label: "480p" },
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
  ],
  default: "720p",
};

const videoResolution2: ModelParam = {
  key: "resolution",
  label: "Resolution",
  type: "select",
  options: [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
  ],
  default: "720p",
};

const generateAudio: ModelParam = {
  key: "generate_audio",
  label: "Generate Audio",
  type: "toggle",
  default: true,
};

const aspectRatioWide: ModelParam = {
  key: "aspect_ratio",
  label: "Aspect Ratio",
  type: "select",
  options: [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
    { value: "4:3", label: "4:3" },
    { value: "3:4", label: "3:4" },
  ],
  default: "16:9",
};

const aspectRatioSeedance: ModelParam = {
  key: "aspect_ratio",
  label: "Aspect Ratio",
  type: "select",
  options: [
    { value: "auto", label: "Auto" },
    { value: "21:9", label: "21:9" },
    { value: "16:9", label: "16:9" },
    { value: "4:3", label: "4:3" },
    { value: "1:1", label: "1:1" },
    { value: "3:4", label: "3:4" },
    { value: "9:16", label: "9:16" },
  ],
  default: "16:9",
};

const aspectRatioSimple: ModelParam = {
  key: "aspect_ratio",
  label: "Aspect Ratio",
  type: "select",
  options: [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
  ],
  default: "16:9",
};

// ── Image param definitions ──

const imageQualityGpt: ModelParam = {
  key: "quality",
  label: "Quality",
  type: "select",
  options: [
    { value: "auto", label: "Auto" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ],
  default: "high",
};

const imageSizeGpt: ModelParam = {
  key: "image_size",
  label: "Aspect Ratio",
  type: "select",
  options: [
    { value: "auto", label: "Auto" },
    { value: "landscape_16_9", label: "16:9" },
    { value: "landscape_4_3", label: "4:3" },
    { value: "square_hd", label: "1:1 HD" },
    { value: "portrait_4_3", label: "3:4" },
    { value: "portrait_16_9", label: "9:16" },
  ],
  default: "landscape_16_9",
};

const imageAspectRatioNano: ModelParam = {
  key: "aspect_ratio",
  label: "Aspect Ratio",
  type: "select",
  options: [
    { value: "auto", label: "Auto" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
    { value: "4:3", label: "4:3" },
    { value: "3:2", label: "3:2" },
    { value: "21:9", label: "21:9" },
  ],
  default: "16:9",
};

const imageResolutionNano: ModelParam = {
  key: "resolution",
  label: "Resolution",
  type: "select",
  options: [
    { value: "0.5K", label: "0.5K" },
    { value: "1K", label: "1K" },
    { value: "2K", label: "2K" },
    { value: "4K", label: "4K" },
  ],
  default: "1K",
};

const imageSizeFlux: ModelParam = {
  key: "image_size",
  label: "Aspect Ratio",
  type: "select",
  options: [
    { value: "landscape_16_9", label: "16:9" },
    { value: "landscape_4_3", label: "4:3" },
    { value: "square_hd", label: "1:1 HD" },
    { value: "portrait_4_3", label: "3:4" },
    { value: "portrait_16_9", label: "9:16" },
  ],
  default: "landscape_16_9",
};

// ── Endpoints ──

export const AVAILABLE_ENDPOINTS: ApiInfo[] = [
  // ── Image ──
  {
    endpointId: "openai/gpt-image-2",
    label: "GPT Image 2",
    description:
      "OpenAI's latest image model with extremely detailed images and fine typography",
    cost: "",
    category: "image",
    inputAsset: ["image"],
    imageEditEndpointId: "openai/gpt-image-2/edit",
    imageInputKey: "image_urls",
    params: [imageSizeGpt, imageQualityGpt],
  },
  {
    endpointId: "fal-ai/nano-banana-2",
    label: "Nano Banana 2",
    description: "Google's state-of-the-art fast image generation model",
    cost: "",
    category: "image",
    inputAsset: ["image"],
    imageEditEndpointId: "fal-ai/nano-banana-2/edit",
    params: [imageAspectRatioNano, imageResolutionNano],
  },
  {
    endpointId: "fal-ai/flux/dev",
    label: "Flux Dev",
    description: "12B parameter flow transformer for high-quality images",
    cost: "",
    category: "image",
    params: [imageSizeFlux],
  },
  {
    endpointId: "fal-ai/flux/schnell",
    label: "Flux Schnell",
    description: "Fast 1-4 step image generation",
    cost: "",
    category: "image",
    params: [imageSizeFlux],
  },
  {
    endpointId: "fal-ai/flux-pro/v1.1-ultra",
    label: "Flux Pro 1.1 Ultra",
    description: "Professional-grade image generation up to 2K",
    cost: "",
    category: "image",
    params: [imageSizeFlux],
  },
  {
    endpointId: "fal-ai/stable-diffusion-v35-large",
    label: "Stable Diffusion 3.5 Large",
    description: "Image quality, typography, complex prompt understanding",
    cost: "",
    category: "image",
    params: [imageSizeFlux],
  },

  // ── Video (generation) ──
  {
    endpointId: "bytedance/seedance-2.0/text-to-video",
    label: "Seedance 2.0",
    description:
      "ByteDance's most advanced model. Cinematic output with native audio, real-world physics, and director-level camera control.",
    cost: "",
    category: "video",
    inputAsset: ["image"],
    imageToVideoEndpointId: "bytedance/seedance-2.0/image-to-video",
    params: [
      aspectRatioSeedance,
      videoDurationSeedance,
      videoResolution3,
      generateAudio,
    ],
  },
  {
    endpointId: "bytedance/seedance-2.0/fast/text-to-video",
    label: "Seedance 2.0 Fast",
    description:
      "Seedance 2.0 fast tier. Lower latency and cost with cinematic output and native audio.",
    cost: "",
    category: "video",
    inputAsset: ["image"],
    imageToVideoEndpointId: "bytedance/seedance-2.0/fast/image-to-video",
    params: [
      aspectRatioSeedance,
      videoDurationSeedance,
      videoResolution3,
      generateAudio,
    ],
  },
  {
    endpointId: "fal-ai/kling-video/v3/pro/text-to-video",
    label: "Kling 3.0 Pro",
    description:
      "Top-tier video with cinematic visuals, fluid motion, and native audio generation.",
    cost: "",
    category: "video",
    inputAsset: [{ type: "image", key: "start_image_url" }],
    imageToVideoEndpointId: "fal-ai/kling-video/v3/pro/image-to-video",
    params: [
      {
        key: "aspect_ratio",
        label: "Aspect Ratio",
        type: "select",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
        default: "16:9",
      },
      {
        key: "duration",
        label: "Duration",
        type: "select",
        options: Array.from({ length: 13 }, (_, i) => ({
          value: String(i + 3),
          label: `${i + 3}s`,
        })),
        default: "5",
      },
      generateAudio,
    ],
  },
  {
    endpointId: "fal-ai/kling-video/v3/standard/text-to-video",
    label: "Kling 3.0 Standard",
    description:
      "Kling 3.0 Standard tier. Cinematic visuals, fluid motion, native audio. Lower cost.",
    cost: "",
    category: "video",
    inputAsset: [{ type: "image", key: "start_image_url" }],
    imageToVideoEndpointId: "fal-ai/kling-video/v3/standard/image-to-video",
    params: [
      {
        key: "aspect_ratio",
        label: "Aspect Ratio",
        type: "select",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
        ],
        default: "16:9",
      },
      {
        key: "duration",
        label: "Duration",
        type: "select",
        options: Array.from({ length: 13 }, (_, i) => ({
          value: String(i + 3),
          label: `${i + 3}s`,
        })),
        default: "5",
      },
      generateAudio,
    ],
  },
  {
    endpointId: "fal-ai/veo3.1",
    label: "Veo 3.1",
    description:
      "Google's most advanced video generation model. With sound on!",
    cost: "",
    category: "video",
    inputAsset: ["image"],
    params: [aspectRatioSimple, videoResolution2, generateAudio],
  },
  {
    endpointId: "fal-ai/veo3",
    label: "Veo 3",
    description: "Google Veo 3. 720p/1080p, 4-8s, with audio generation.",
    cost: "",
    category: "video",
    params: [
      aspectRatioSimple,
      {
        key: "duration",
        label: "Duration",
        type: "select",
        options: [
          { value: "4s", label: "4s" },
          { value: "6s", label: "6s" },
          { value: "8s", label: "8s" },
        ],
        default: "8s",
      },
      videoResolution2,
      generateAudio,
    ],
  },
  {
    endpointId: "fal-ai/wan/v2.7/text-to-video",
    label: "Wan 2.7",
    description:
      "Latest generation Wan model. Enhanced motion smoothness, superior scene fidelity, multi-shot support, audio generation.",
    cost: "",
    category: "video",
    inputAsset: ["image"],
    imageToVideoEndpointId: "fal-ai/wan/v2.7/image-to-video",
    params: [
      aspectRatioWide,
      {
        key: "duration",
        label: "Duration",
        type: "select",
        options: Array.from({ length: 14 }, (_, i) => ({
          value: String(i + 2),
          label: `${i + 2}s`,
        })),
        default: "5",
      },
      videoResolution2,
    ],
  },

  // ── Video (utility) ──
  {
    endpointId: "fal-ai/mmaudio-v2",
    label: "MMAudio V2",
    description:
      "MMAudio generates synchronized audio given video and/or text inputs.",
    cost: "",
    inputAsset: ["video"],
    category: "video",
  },
  {
    endpointId: "fal-ai/sync-lipsync",
    label: "sync.so -- lipsync 1.8.0",
    description:
      "Generate realistic lipsync animations from audio using advanced algorithms.",
    cost: "",
    inputAsset: ["video", "audio"],
    category: "video",
  },
  {
    endpointId: "fal-ai/topaz/upscale/video",
    label: "Topaz Video Upscale",
    description: "Professional-grade video upscaling using Topaz technology.",
    cost: "",
    category: "video",
    prompt: false,
    inputAsset: ["video"],
  },

  // ── Music ──
  {
    endpointId: "fal-ai/minimax-music",
    label: "Minimax Music",
    description:
      "Advanced AI techniques to create high-quality, diverse musical compositions",
    cost: "",
    category: "music",
    inputAsset: [{ type: "audio", key: "reference_audio_url" }],
  },
  {
    endpointId: "fal-ai/stable-audio",
    label: "Stable Audio",
    description: "Stable Diffusion music creation with high-quality tracks",
    cost: "",
    category: "music",
  },

  // ── Voiceover ──
  {
    endpointId: "elevenlabs/tts/v3",
    label: "ElevenLabs v3",
    description:
      "ElevenLabs' latest v3 model. High quality, natural sounding speech.",
    cost: "",
    category: "voiceover",
    inputMap: { prompt: "text" },
    initialInput: {
      voice_id: "21m00Tcm4TlvDq8ikWAM",
      model_id: "eleven_v3",
    },
  },
  {
    endpointId: "fal-ai/elevenlabs/tts/turbo-v2.5",
    label: "ElevenLabs TTS v2.5 (fal)",
    description:
      "High quality text-to-speech with lowest latency via fal.ai. Supports 32 languages.",
    cost: "",
    category: "voiceover",
    inputMap: { prompt: "text" },
    initialInput: {
      voice: "Aria",
      stability: 0.5,
      similarity_boost: 0.75,
    },
  },
  {
    endpointId: "fal-ai/playht/tts/v3",
    label: "PlayHT TTS v3",
    description: "Fluent and faithful speech with flow matching",
    cost: "",
    category: "voiceover",
    initialInput: { voice: "Dexter (English (US)/American)" },
  },
  {
    endpointId: "fal-ai/playai/tts/dialog",
    label: "PlayAI Text-to-Speech Dialog",
    description: "Generate natural-sounding multi-speaker dialogues.",
    cost: "",
    category: "voiceover",
    inputMap: { prompt: "input" },
    initialInput: {
      voices: [
        {
          voice: "Jennifer (English (US)/American)",
          turn_prefix: "Speaker 1: ",
        },
        { voice: "Furio (English (IT)/Italian)", turn_prefix: "Speaker 2: " },
      ],
    },
  },
  {
    endpointId: "fal-ai/f5-tts",
    label: "F5 TTS",
    description: "Fluent and faithful speech with flow matching",
    cost: "",
    category: "voiceover",
    initialInput: {
      ref_audio_url:
        "https://github.com/SWivid/F5-TTS/raw/21900ba97d5020a5a70bcc9a0575dc7dec5021cb/tests/ref_audio/test_en_1_ref_short.wav",
      ref_text: "Some call me nature, others call me mother nature.",
      model_type: "F5-TTS",
      remove_silence: true,
    },
  },
];
