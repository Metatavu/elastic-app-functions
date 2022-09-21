/**
 * Schema object for scheduled crawl REST entity
 */
export default {
  type: "object",
  properties: {
    id: { type: 'string', format: 'UUID' },
    previousCrawlId: { type: 'string' },
    name: { type: 'string' },
    seedURLs: { type: 'array', items: { type: 'string'} },
    frequency: { type: 'number' },
  },
  required: [ 'id', 'name', 'seedURLs', 'frequency' ]
} as const;