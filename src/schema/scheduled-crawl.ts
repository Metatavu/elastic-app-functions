import { Static, Type } from "@sinclair/typebox";

/**
 * Schema object for scheduled crawl REST entity
 */
export const scheduledCrawlSchema = Type.Object({
  id: Type.Optional(Type.String({
    format: "uuid",
    description: "Unique identifier for the scheduled crawl"
  })),
  name: Type.String({
    description: "Name of the scheduled crawl"
  }),
  enabled: Type.Boolean({
    description: "Whether the scheduled crawl is enabled or not"
  }),
  priority: Type.Number({
    minimum: 0,
    description: `
      Priority of the scheduled crawl. Lower number means higher priority. 0 is the highest priority.
      Used to determine which crawl to run first if multiple are scheduled at the same time.
      Also used to determine which crawl to run first if other crawls are delayed due to an active crawl.
    `
  }),
  maxCrawlDepth: Type.Number({
    description: "Maximum crawl depth. Minimum of 1. Maximum of 10, which is the same as in default full crawl.",
    minimum: 1,
    maximum: 10,
  }),
  domainAllowlist: Type.Optional(Type.Array(Type.String(), {
    description: "Array of domain names for restricting which links to follow"
  })),
  seedURLs: Type.Optional(Type.Array(Type.String(), {
    description: "Array of initial URLs to crawl. Defaults to the configured entrypoints for each crawler domain."
  })),
  scheduleCron: Type.String({
    description: "Schedule of the crawl in CRON syntax of (minute) (hour) (day of month) (month) (day of week)."
  }),
  previousCrawlId: Type.Optional(Type.String({
    description: "Unique identifier of the previous crawl from Elastic App Search. Filled when starting a new crawl."
  })),
  previousCrawlCompletedAt: Type.Optional(Type.String({
    format: "date-time",
    description: "Timestamp of when the previous crawl was completed. If missing, filled during checking if a new crawl should be started."
  })),
});

export type ScheduledCrawl = Static<typeof scheduledCrawlSchema>;