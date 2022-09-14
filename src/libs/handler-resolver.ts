/**
 * Utility method for handling paths
 * 
 * @param context context
 * @returns path
 */
export const handlerPath = (context: string) => {
  return `${context.split(process.cwd())[1].substring(1).replace(/\\/g, '/')}`
};
