import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  DeleteTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type MediaFormat,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { env } from "@extractify/env/worker";
import { type ExtractionStrategy, SUPPORTED_AUDIO_TYPES } from "./types";

const AUDIO_FORMAT_BY_EXTENSION: Record<string, MediaFormat> = {
  mp3: "mp3",
  wav: "wav",
  m4a: "mp4",
  mp4: "mp4",
};

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

const MAX_TRANSCRIBE_WAIT_MS = 10 * 60 * 1000;
const INITIAL_POLL_DELAY_MS = 2_000;
const MAX_POLL_DELAY_MS = 15_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() : undefined;
}

function getMediaFormat(fileName: string): MediaFormat {
  const extension = getExtension(fileName);
  if (!extension) {
    return "mp3";
  }

  return AUDIO_FORMAT_BY_EXTENSION[extension] ?? "mp3";
}

function getContentType(fileName: string) {
  const extension = getExtension(fileName);
  if (!extension) {
    return undefined;
  }
  return AUDIO_MIME_BY_EXTENSION[extension];
}

function buildS3Key(fileName: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `transcribe/${crypto.randomUUID()}-${sanitized}`;
}

async function fetchTranscriptText(transcriptUri: string) {
  const response = await fetch(transcriptUri);
  if (!response.ok) {
    throw new Error("Unable to fetch transcription output");
  }

  const payload = (await response.json()) as {
    results?: { transcripts?: { transcript?: string }[] };
  };

  const transcript = payload.results?.transcripts?.[0]?.transcript;
  return transcript ?? "";
}

export class AudioExtractionStrategy implements ExtractionStrategy {
  private s3Client: S3Client;
  private transcribeClient: TranscribeClient;

  constructor() {
    const credentials = fromNodeProviderChain();
    this.s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials,
    });
    this.transcribeClient = new TranscribeClient({
      region: env.AWS_REGION,
      credentials,
    });
  }

  supports(fileType: string): boolean {
    return SUPPORTED_AUDIO_TYPES.includes(
      fileType as (typeof SUPPORTED_AUDIO_TYPES)[number],
    );
  }

  async extractText(fileData: ArrayBuffer, fileName: string): Promise<string> {
    const bucket = env.AWS_TRANSCRIBE_BUCKET;
    const key = buildS3Key(fileName);
    const buffer = Buffer.from(fileData);
    const mediaFormat = getMediaFormat(fileName);
    const contentType = getContentType(fileName);
    const jobName = `extractify-${crypto.randomUUID()}`;

    console.log("[worker] Uploading audio file to S3 for transcription...");

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
    );

    const mediaUri = `s3://${bucket}/${key}`;

    try {
      await this.transcribeClient.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          IdentifyLanguage: true,
          MediaFormat: mediaFormat,
          Media: {
            MediaFileUri: mediaUri,
          },
        }),
      );

      const startedAt = Date.now();
      let delay = INITIAL_POLL_DELAY_MS;

      while (Date.now() - startedAt < MAX_TRANSCRIBE_WAIT_MS) {
        const status = await this.transcribeClient.send(
          new GetTranscriptionJobCommand({
            TranscriptionJobName: jobName,
          }),
        );

        const job = status.TranscriptionJob;
        const jobStatus = job?.TranscriptionJobStatus;

        if (jobStatus === "COMPLETED") {
          const transcriptUri = job?.Transcript?.TranscriptFileUri;
          if (!transcriptUri) {
            throw new Error("Transcription completed without output");
          }
          return await fetchTranscriptText(transcriptUri);
        }

        if (jobStatus === "FAILED") {
          throw new Error(
            job?.FailureReason || "Transcription failed. Please try again.",
          );
        }

        await sleep(delay);
        delay = Math.min(delay * 2, MAX_POLL_DELAY_MS);
      }

      throw new Error(
        "Transcription is taking longer than expected. Please try again.",
      );
    } finally {
      await Promise.allSettled([
        this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        ),
        this.transcribeClient.send(
          new DeleteTranscriptionJobCommand({
            TranscriptionJobName: jobName,
          }),
        ),
      ]);
    }
  }
}
