import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

class DBClient {
  /**
     * Constructor for the DBClient class.
     *
     * Connects to a MongoDB database using the provided environment variables or default values.
     * If the connection is successful, the `db` property is set to the connected database.
     * If the connection fails, the `db` property is set to `null` and an error message is logged.
     *
     * @constructor
     */
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const dbName = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${dbName}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true, useNewUrlParser: true });

    this.client.connect()
      .then(() => {
        this.db = this.client.db(dbName);
      })
      .catch((err) => {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        this.db = null;
      });
  }

  /**
     * Checks if the MongoDB client is connected.
     *
     * @return {boolean} Returns true if the client is connected, false otherwise.
     */
  isAlive() {
    return this.client.isConnected();
  }

  /**
     * Asynchronously retrieves the number of users in the 'users' collection.
     *
     * @return {Promise<number|null>} The number of users, or null if the
     * database connection is not established.
     */
  async nbUsers() {
    if (!this.db) {
      return null;
    }
    const result = await this.db
      .collection('users')
      .countDocuments();
    return result;
  }

  /**
     * Asynchronously retrieves the number of files in the 'files' collection.
     *
     * @return {Promise<number|null>} The number of files, or null
     * if the database connection is not established.
     */
  async nbFiles() {
    if (!this.db) {
      return null;
    }
    const result = await this.db
      .collection('files')
      .countDocuments();
    return result;
  }
}

const dbClient = new DBClient();
export default dbClient;
