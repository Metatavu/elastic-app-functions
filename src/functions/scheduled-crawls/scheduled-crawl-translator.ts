import { Value } from "@sinclair/typebox/build/cjs/value";
import { ScheduledCrawl, scheduledCrawlSchema } from "src/schema/scheduled-crawl";
import cronParser from "cron-parser";

export const scheduledCrawlDtoToEntity = (dto: ScheduledCrawl): ScheduledCrawl => {
  const scheduledCrawl = Value.Parse(scheduledCrawlSchema, dto);
  cronParser.parseExpression(scheduledCrawl.scheduleCron);
  return scheduledCrawl;
};

export const scheduledCrawlEntityToDto = (props: ScheduledCrawl): ScheduledCrawl => {
  return {
    enabled: props.enabled,
    id: props.id,
    maxCrawlDepth: props.maxCrawlDepth,
    name: props.name,
    priority: props.priority,
    domainAllowlist: props.domainAllowlist,
    seedURLs: props.seedURLs,
    scheduleCron: props.scheduleCron,
    previousCrawlId: props.previousCrawlId,
    previousCrawlCompletedAt: props.previousCrawlCompletedAt,
  };
};