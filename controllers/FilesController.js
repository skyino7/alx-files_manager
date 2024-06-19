import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  /**
   * Uploads a file to the server.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<Object>} The uploaded file information.
   */
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const validTypes = ['folder', 'file', 'image'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      if (!ObjectId.isValid(parentId)) {
        return res.status(400).json({ error: 'Invalid parentId' });
      }
      const parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new ObjectId(parentId),
      localPath: '',
    };

    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileName = uuidv4();
      const localPath = path.join(folderPath, fileName);
      const fileData = Buffer.from(data, 'base64');

      fs.writeFileSync(localPath, fileData);
      newFile.localPath = localPath;
    }

    const result = await dbClient.db.collection('files').insertOne(newFile);

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: newFile.localPath,
    });
  }

  /**
   * Retrieves and returns a specific file based on the provided file ID.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<Object>} A promise that resolves to the retrieved file object.
   */
  static async getShow(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: new ObjectId(fileId),
      userId,
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  /**
 * Retrieves a paginated list of files for a given user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Promise<Object>} A promise that resolves to the response object.
 */
  static async getIndex(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = '0', page = 0 } = req.query;
    const limit = 20;
    const skip = page * limit;

    let parentObjectId;
    if (parentId === '0') {
      parentObjectId = 0;
    } else if (ObjectId.isValid(parentId)) {
      parentObjectId = new ObjectId(parentId);
    } else {
      return res.status(400).json({ error: 'Invalid parentId' });
    }

    const query = {
      userId,
      parentId: parentObjectId,
    };

    // console.log('Query:', query);

    const files = await dbClient.db.collection('files')
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    // console.log('Files:', files);

    return res.status(200).json(files);
  }

  /**
   * Updates a file to be published based on the provided file ID.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<Object>} The updated file object.
   */
  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const updatedFile = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: fileId },
        { $set: { isPublic: true } },
        { returnOriginal: false }
      );

      return res.status(200).json(updatedFile.value);
    } catch (error) {
      console.error('Error while updating file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Unpublishes a file by setting its "isPublic" property to false.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise<Object>} The updated file object.
   */
  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const updatedFile = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: fileId },
        { $set: { isPublic: false } },
        { returnOriginal: false }
      );

      return res.status(200).json(updatedFile.value);
    } catch (error) {
      console.error('Error while updating file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

}

export default FilesController;
