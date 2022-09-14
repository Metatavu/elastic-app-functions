/**
 * Parses date
 * 
 * @param date date as string 
 * @returns parsed date
 */
export const parseDate = (date?: string): Date | undefined => {
  if (!date) {
    return null;
  }

  return new Date(Date.parse(date));
}