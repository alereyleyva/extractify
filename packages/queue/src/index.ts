import { env } from "@extractify/env/db";
import PgBoss from "pg-boss";

export const EXTRACTION_QUEUE = "extraction" as const;

let boss: PgBoss | null = null;

export async function getQueueClient(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      expireInHours: 23,
    });

    boss.on("error", (error: Error) => {
      console.error("[pg-boss] Error:", error);
    });

    await boss.start();
    await boss.createQueue(EXTRACTION_QUEUE);
    console.log("[pg-boss] Queue client started");
  }

  return boss;
}

export async function stopQueueClient(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 30000 });
    boss = null;
    console.log("[pg-boss] Queue client stopped");
  }
}

export interface ExtractionJobData {
  extractionId: string;
  ownerId: string;
  modelId: string;
  modelVersionId: string;
  llmModelId: string;
  integrationTargetIds?: string[];
  files: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    sourceOrder: number;
  }>;
}

export async function enqueueExtraction(
  data: ExtractionJobData,
): Promise<string | null> {
  const boss = await getQueueClient();
  const jobId = await boss.send(EXTRACTION_QUEUE, data, {
    retryLimit: 3,
    retryDelay: 10,
    retryBackoff: true,
    expireInMinutes: 60,
  });

  if (jobId) {
    console.log(
      `[pg-boss] Enqueued extraction job ${jobId} for extraction ${data.extractionId}`,
    );
  }

  return jobId;
}

export type { PgBoss };
