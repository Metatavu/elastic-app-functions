import { cleanEnv, str, url } from "envalid";

/**
 * Validates that environment variables are in place and have correct form
 */
export default cleanEnv(process.env, {
  ELASTIC_URL: url(),
  ELASTIC_APP_ENGINE: str(),
  ELASTIC_ADMIN_USERNAME: str(),
  ELASTIC_ADMIN_PASSWORD: str(),
  AWS_DEFAULT_REGION: str(),
  CONTACT_PERSONS_URL: url()
});
