/**
 * DynamoDB model for authentication
 */
interface Authentication {
  username: string;
  password: string;
  token: string;
};

export default Authentication;