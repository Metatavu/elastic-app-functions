import { Type } from "@sinclair/typebox";

/**
 * Schema object for create document lambda body
 */
const createDocumentSchema = Type.Object({
  title: Type.Optional(Type.String()),
  links: Type.Optional(Type.String()),
  description: Type.Optional(Type.String())
});

export default createDocumentSchema;