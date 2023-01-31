import { Type } from "@sinclair/typebox";

/**
 * Schema object for timed curation REST entity
 */
const timedCurationSchema = Type.Object({
  queries: Type.Array(Type.String()),
  promoted: Type.Array(Type.String()),
  hidden: Type.Array(Type.String()),
  startTime: Type.Optional(Type.String()),
  endTime: Type.Optional(Type.String())
});

export default timedCurationSchema;