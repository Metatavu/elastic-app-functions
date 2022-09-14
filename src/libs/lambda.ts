import middy from "@middy/core"
import middyJsonBodyParser from "@middy/http-json-body-parser"

/**
 * Middyfies given handler
 * 
 * @param handler handler
 * @returns middyfied handler
 */
export const middyfy = (handler) => {
  return middy(handler).use(middyJsonBodyParser())
}
