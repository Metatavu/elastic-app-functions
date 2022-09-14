import { cleanEnv, str, url } from "envalid";

/**
 * Validates that environment variables are in place and have correct form
 */
export default cleanEnv(process.env, {
  ELASTIC_URL: url(),
  ELASTIC_APP_ENGINE: str(),
  ELASTIC_ADMIN_USERNAME: str({ default: null }),
  ELASTIC_ADMIN_PASSWORD: str({ default: null })
});
