import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';


class UsersController {

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
