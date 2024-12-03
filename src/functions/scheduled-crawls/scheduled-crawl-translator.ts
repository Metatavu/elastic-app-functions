import { Value } from "@sinclair/typebox/value";
import { ScheduledCrawl, scheduledCrawlSchema } from "src/schema/scheduled-crawl";
import cronParser from "cron-parser";

export const scheduledCrawlDtoToEntity = (dto: ScheduledCrawl): ScheduledCrawl => {
  const scheduledCrawl = Value.Parse(scheduledCrawlSchema, dto);
  cronParser.parseExpression(scheduledCrawl.scheduleCron);
  return scheduledCrawl;
};

export const scheduledCrawlEntityToDto = (entity: ScheduledCrawl): ScheduledCrawl => {
  return {
    enabled: entity.enabled,
    id: entity.id,
    maxCrawlDepth: entity.maxCrawlDepth,
    name: entity.name,
    priority: entity.priority,
    domainAllowlist: entity.domainAllowlist,
    seedURLs: entity.seedURLs,
    scheduleCron: entity.scheduleCron,
    previousCrawlId: entity.previousCrawlId,
    previousCrawlCompletedAt: entity.previousCrawlCompletedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
};