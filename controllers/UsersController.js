import sha1 from 'sha1';
import dbClient from '../utils/db';


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
        { error: 'Missing email' }
    );
    } else if (!password) {
      return res.status(400).json(
        { error: 'Missing Password' }
    );
    } else {

      const collection = await dbClient.db.collection('users');
      const existingUser = await collection.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      } else {
        const hashedPassword = sha1(password);
        const newUser = await collection.insertOne({
          email, password: hashedPassword,
        });
        const { _id } = newUser.ops[0];
        return res.status(201).json(
            { email, id: _id }
        );
      }

    }
  }

}

export default UsersController;
