import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });
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
}

export default FilesController;
