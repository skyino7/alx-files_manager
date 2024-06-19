import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  /**
   * Creates a new user in the database.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<void>} A Promise that resolves with a JSON response
   * containing the user's email and ID if the user is successfully created,
   * or rejects with a JSON response containing an error message if the user
   * already exists or if the email or password is missing.
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json(
        { error: 'Missing email' },
      );
    } if (!password) {
      return res.status(400).json(
        { error: 'Missing Password' },
      );
    }

    const collection = await dbClient.db.collection('users');
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = sha1(password);
    const newUser = await collection.insertOne({
      email, password: hashedPassword,
    });
    const { _id } = newUser.ops[0];
    return res.status(201).json(
      { email, id: _id },
    );
  }

  /**
   * Retrieves user information based on the provided token.
   *
   * @param {Object} req - The request object containing the token.
   * @param {Object} res - The response object to send back user information.
   * @return {Promise<void>} A Promise that resolves with the user's email and ID if authorized,
   * or rejects with an 'Unauthorized' error if no user is found.
   */
  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const collection = dbClient.db.collection('users');
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ email: user.email, id: user._id });
  }
}

export default UsersController;
