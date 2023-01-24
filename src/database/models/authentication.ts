/**
 * DynamoDB model for authentication
 */
interface AuthenticationSession {
  id: string;
  username: string;
  password: string;
  token: string;
  expiresAt: number;
};

export default AuthenticationSession;