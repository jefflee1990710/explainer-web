// Ambient types for editor packages that do not ship declarations.
// The Whisper import is aliased to a stub at build time; this only satisfies the type checker.

declare module "soundtouchjs" {
  export class PitchShifter {
    constructor(context: BaseAudioContext, buffer: AudioBuffer, bufferSize: number);
    tempo: number;
    pitch: number;
    connect(destination: AudioNode): void;
  }
}

declare module "@huggingface/transformers" {
  export type AutomaticSpeechRecognitionOutput = {
    text: string;
    chunks?: Array<{ text: string; timestamp?: number[] }>;
  };
  export type AutomaticSpeechRecognitionPipeline = (
    audio: Float32Array,
    options: Record<string, unknown>,
  ) => Promise<AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[]>;
  export function pipeline(
    task: string,
    modelId: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}

interface EyeDropper {
  open(): Promise<{ sRGBHex: string }>;
}

declare var EyeDropper: { new (): EyeDropper } | undefined;
