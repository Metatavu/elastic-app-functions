import { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/**
 * Validate value against schema
 *
 * @param value value to validate
 * @param schema schema to validate against
 * @returns true if value is valid, false otherwise
 */
export const validateSchema = <S extends TSchema>(value: any, schema: S): value is Static<S> => {
  const validationErrors = [ ...Value.Errors(schema, value) ];
  validationErrors.forEach(({ path, message, value }) => console.error(`Path '${path}': ${message}, found ${value}`));
  return !validationErrors.length;
};