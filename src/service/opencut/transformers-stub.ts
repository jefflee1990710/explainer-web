// OpenCut's local Whisper worker is not bundled into Scro. Subtitle plates come from Scro.

export type AutomaticSpeechRecognitionPipeline = unknown;
export type AutomaticSpeechRecognitionOutput = { text?: string; chunks?: unknown[] };

export async function pipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  throw new Error("Transcription is handled by Scro.");
}
