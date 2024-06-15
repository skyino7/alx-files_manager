import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class AppController {
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

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