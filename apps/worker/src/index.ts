import {
  EXTRACTION_QUEUE,
  type ExtractionJobData,
  getQueueClient,
  stopQueueClient,
} from "@extractify/queue";
import type PgBoss from "pg-boss";
import { processExtraction } from "./handlers/extraction";

async function main() {
  console.log("[worker] Starting extraction worker...");

  const boss = await getQueueClient();

  await boss.work<ExtractionJobData>(
    EXTRACTION_QUEUE,
    async (jobs: PgBoss.Job<ExtractionJobData>[]) => {
      for (const job of jobs) {
        const startTime = Date.now();
        console.log(
          `[worker] Processing extraction ${job.data.extractionId} (job ${job.id})`,
        );

        try {
          await processExtraction(job.data);
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(
            `[worker] Completed extraction ${job.data.extractionId} in ${duration}s`,
          );
        } catch (error) {
          console.error(
            `[worker] Failed extraction ${job.data.extractionId}:`,
            error,
          );
          throw error;
        }
      }
    },
  );

  console.log(`[worker] Listening for jobs on queue: ${EXTRACTION_QUEUE}`);

  const shutdown = async (signal: string) => {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);
    await stopQueueClient();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[worker] Fatal error:", error);
  process.exit(1);
});
