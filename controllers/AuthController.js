import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  /**
     * Async function to handle user authentication and token generation.
     *
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     * @return {Object} The generated token upon successful authentication.
     */
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [email, password] = decodedCredentials.split(':');

    if (!email || !password) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const hashedPassword = sha1(password);
    const userCollection = dbClient.db.collection('users');
    const user = await userCollection.findOne({ email, password: hashedPassword });

    if (!user) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);
    return res.status(200).json({ token });
  }

  /**
     * Disconnects the user associated with the provided token by deleting
     * the corresponding Redis key.
     *
     * @param {Object} req - The request object containing the token in the 'x-token' header.
     * @param {Object} res - The response object.
     * @return {Promise<void>} A Promise that resolves when the user is successfully disconnected.
     */
  static async getDisconnect(req, res) {
    const token = await req.header('x-token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (userId) {
      await redisClient.del(key);
    }

    res.status(204).send();
  }
}

export default AuthController;
