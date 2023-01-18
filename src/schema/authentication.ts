import { Type } from "@sinclair/typebox";

/**
 * Schema object for authentication REST entity
 */
const authenticationSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  username: Type.String(),
  password: Type.String(),
  token: Type.String(),
  expiry: Type.Number()
});

export default authenticationSchema;