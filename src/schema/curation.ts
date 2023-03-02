import { Type } from "@sinclair/typebox";
import { CurationType } from "@types";

/**
 * Schema object for timed curation REST entity
 */
const curationSchema = Type.Object({
  queries: Type.Array(Type.String()),
  promoted: Type.Array(Type.String()),
  hidden: Type.Array(Type.String()),
  startTime: Type.Optional(Type.String()),
  endTime: Type.Optional(Type.String()),
  groupId: Type.Optional(Type.String({ format: "uuid" })),
  curationType: Type.Enum(CurationType),
  document: Type.Optional(Type.Object({
    title: Type.String(),
    links: Type.String(),
    description: Type.String(),
    language: Type.String()
  }))
});

export default curationSchema;