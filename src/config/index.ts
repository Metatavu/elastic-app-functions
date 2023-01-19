import { cleanEnv, num, str, url } from "envalid";
import * as dotenv from "dotenv";

dotenv.config();
/**
 * Validates that environment variables are in place and have correct form
 */
export default cleanEnv(process.env, {
  ELASTIC_URL: url(),
  ELASTIC_APP_ENGINE: str(),
  ELASTIC_ADMIN_USERNAME: str(),
  ELASTIC_ADMIN_PASSWORD: str(),
  AWS_DEFAULT_REGION: str(),
  CONTACT_PERSONS_URL: url(),
  CONTACT_SYNC_INTERVAL_IN_DAYS: num(),
  SUOMIFI_ORGANIZATION_ID: str()
});
