import middy from "@middy/core"
import middyJsonBodyParser from "@middy/http-json-body-parser"

/**
 * Middyfies given handler
 * z
 * @param handler handler
 * @returns middyfied handler
 */
export const middyfy = (handler: any) => {
  return middy(handler).use(middyJsonBodyParser())
}
