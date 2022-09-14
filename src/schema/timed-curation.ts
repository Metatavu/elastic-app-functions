/**
 * Schema object for timed curation REST entity
 */
export default {
  type: "object",
  properties: {
    queries: { type: 'array', items: { type: "string" } },
    promoted: { type: 'array', items: { type: "string" } },
    hidden: { type: 'array', items: { type: "string" } },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
  },
  required: [ 'queries', 'promoted', 'hidden', 'startTime', 'endTime' ]
} as const;
