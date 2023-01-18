/**
 * DynamoDB model for authentication
 */
interface Authentication {
  username: string;
  password: string;
  token: string;
  expiry: number;
};

export default Authentication;