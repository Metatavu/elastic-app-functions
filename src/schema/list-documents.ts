import { Type } from "@sinclair/typebox";

/**
 * Schema object for List Documents lambda body
 */
const listDocumentsSchema = Type.Object({
  documentIds: Type.Array(Type.String())
});

export default listDocumentsSchema;