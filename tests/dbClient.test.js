import { MongoClient } from 'mongodb';
import dbClient from '../utils/db';

describe('Database Client', () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = connection.db(global.__MONGO_DB_NAME__);

    dbClient.db = db;
  });

  afterAll(async () => {
    await connection.close();
  });

  it('should insert and find a document in the database', async () => {
    const collection = db.collection('testCollection');
    const testDocument = { name: 'Test Document' };

    await collection.insertOne(testDocument);

    const insertedDocument = await collection.findOne({ name: 'Test Document' });
    expect(insertedDocument).toEqual(testDocument);
  });
});
