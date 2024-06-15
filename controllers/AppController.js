import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class AppController {

  /**
   * Retrieves the status of the Redis client and the database client and sends a JSON response with the counts.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<void>} A Promise that resolves when the response is sent, or rejects with an error.
   */
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  /**
   * Retrieves the number of users and files in the database and sends a JSON response with the counts.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<void>} A Promise that resolves when the response is sent, or rejects with an error.
   */
  static async getStats(req, res) {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();
      res.status(200).json({ users, files });
    } catch (error) {
      res.status(500).json({
        status: 500,
        error: "Internal server error",
      });
    }
  }
}

export default AppController;