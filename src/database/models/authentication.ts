/**
 * DynamoDB model for authentication
 */
interface Authentication {
  username: string;
  password: string;
  token: string;
  expiresAt: number;
};

export default Authentication;