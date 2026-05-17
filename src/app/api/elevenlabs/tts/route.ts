import { NextRequest, NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get("x-elevenlabs-key");
  const apiKey = clientKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured. Add it in Settings." },
      { status: 500 },
    );
  }

  const body = await request.json();
  const {
    text,
    voice_id = DEFAULT_VOICE_ID,
    model_id = "eleven_v3",
    stability = 0.5,
    similarity_boost = 0.75,
  } = body;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: {
          stability,
          similarity_boost,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `ElevenLabs API error: ${response.status} ${errorText}` },
      { status: response.status },
    );
  }

  const audioBuffer = await response.arrayBuffer();

  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'attachment; filename="speech.mp3"',
    },
  });
}
