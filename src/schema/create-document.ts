import { Type } from "@sinclair/typebox";

/**
 * Schema object for create document lambda body
 */
const createDocumentSchema = Type.Object({
  title: Type.String(),
  links: Type.String(),
  description: Type.String()
});

export default createDocumentSchema;