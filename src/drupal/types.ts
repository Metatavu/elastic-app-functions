/**
 * Drupal settings JSON with property to decipher content categories for service and unit
 */
export interface DrupalSettingsJson {
  path?: {
    currentPath?: string | null;
    currentLanguage?: string | null;
  };
}