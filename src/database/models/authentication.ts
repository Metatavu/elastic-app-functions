/**
 * DynamoDB model for authentication
 */
interface AuthenticationSession {
  username: string;
  password: string;
  token: string;
  expiresAt: number;
};

export default Authentication;