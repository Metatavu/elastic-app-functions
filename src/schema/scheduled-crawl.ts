import { Type } from "@sinclair/typebox";

/**
 * Schema object for scheduled crawl REST entity
 */
const scheduledCrawlSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  name: Type.String(),
  seedURLs: Type.Array(Type.String()),
  frequency: Type.Number(),
  previousCrawlId: Type.Optional(Type.String())
});

export default scheduledCrawlSchema;