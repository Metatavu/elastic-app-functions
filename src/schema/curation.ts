import { Type } from "@sinclair/typebox";

/**
 * Schema object for timed curation REST entity
 */
const curationSchema = Type.Object({
  queries: Type.Array(Type.String()),
  promoted: Type.Array(Type.String()),
  hidden: Type.Array(Type.String()),
  startTime: Type.Optional(Type.String()),
  endTime: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  links: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  language: Type.Optional(Type.String()),
  curationType: Type.String()
});

export default curationSchema;