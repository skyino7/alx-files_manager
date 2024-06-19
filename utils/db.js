const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect().then(() => {
      this.db = this.client.db(database);
      console.log('Connected to MongoDB');
    }).catch((err) => {
      console.error('Failed to connect to MongoDB', err);
    });
  }

  isAlive() {
    return this.client.topology && this.client.topology.isConnected();
  }

  async nbUsers() {
    if (this.isAlive()) {
      return this.db.collection('users').countDocuments();
    }
    return 0;
  }

  async nbFiles() {
    if (this.isAlive()) {
      return this.db.collection('files').countDocuments();
    }
    return 0;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
