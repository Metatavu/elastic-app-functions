export const CALENDAR_CONTENT_TYPES = [
  "text/calendar; charset=UTF-8",
  "text/calendar; charset=windows-1252"
];

export const IMAGE_CONTENT_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/vnd.dgn; version=8",
  "image/vnd.dwg"
];

export const AUDIO_CONTENT_TYPES = [
  "audio/mpeg"
];

export const DOCUMENT_CONTENT_TYPES = [
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template"
];

export const OTHER_CONTENT_TYPES = [
  "application/octet-stream",
  "application/rss+xml",
  "application/rtf",
  "application/zip"
];

export const HTML_CONTENT_TYPES = [
  "text/html; charset=ISO-8859-1",
  "text/html; charset=UTF-8"
];

export const PLAIN_CONTENT_TYPES = [
  "text/plain; charset=ISO-8859-1",
  "text/plain; charset=UTF-8",
  "text/plain; charset=windows-1252"
];

export const ALL_CONTENT_TYPES = [
  ...AUDIO_CONTENT_TYPES,
  ...CALENDAR_CONTENT_TYPES,
  ...DOCUMENT_CONTENT_TYPES,
  ...HTML_CONTENT_TYPES,
  ...IMAGE_CONTENT_TYPES,
  ...OTHER_CONTENT_TYPES,
  ...PLAIN_CONTENT_TYPES
];

export const SUPPORTED_LANGUAGES = [
  "de",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "it",
  "la",
  "lt",
  "no",
  "ro",
  "ru",
  "sk",
  "so",
  "sv"
];