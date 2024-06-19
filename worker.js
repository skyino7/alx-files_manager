import Bull from 'bull';
import fs from 'fs';
import path from 'path';
import { fileQueue } from './utils/queue';
import dbClient from './utils/db';
import thumbnail from 'image-thumbnail';

fileQueue.process(async (job) => {
  const { userId, fileId, localPath } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  if (file.type === 'image') {
    const thumbnailSizes = [500, 250, 100];

    for (const size of thumbnailSizes) {
      try {
        const thumbnailBuffer = await thumbnail(localPath, { width: size });
        const thumbnailPath = `${localPath}_${size}`;
        fs.writeFileSync(thumbnailPath, thumbnailBuffer);
      } catch (error) {
        console.error(`Error generating thumbnail ${size}px for file ${fileId}:`, error);
      }
    }
  } else {
    console.error(`File ${fileId} is not an image, skipping thumbnail generation.`);
  }
});
