import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
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
      const parentFile = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(parentId) });
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
      parentId,
      localPath: '',
    };

    if (type === 'folder') {
      try {
        const result = await dbClient.db.collection('files').insertOne(newFile);
        return res.status(201).json({
          id: result.insertedId,
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      } catch (error) {
        console.error('Error while creating folder:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    try {
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
      newFile.localPath = localPath;

      const result = await dbClient.db.collection('files').insertOne(newFile);

      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
        localPath,
      });
    } catch (error) {
      console.error('Error while uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;
