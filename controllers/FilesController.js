import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, readFileSync } from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const collection = await dbClient.db.collection('files');
      const key = `auth_${token}`;
      const dir = process.env.FOLDER_PATH || '/tmp/files_manager';
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUser({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const { name } = req.body;
      const { type } = req.body;
      let parentId = req.body.parentId || 0;
      parentId = parentId === '0' ? 0 : parentId;
      const { isPublic } = req.body || false;
      const { data } = req.body;

      if (!name) {
        return res.status(400).send({ error: 'Missing name' });
      }
      if (!type) {
        return res.status(400).send({ error: 'Missing type' });
      }
      const fileTypes = ['folder', 'file', 'image'];
      if (!fileTypes.includes(type)) {
        return res.status(400).send({ error: 'Missing type' });
      }
      if (!data && type !== 'folder') {
        return res.status(400).send({ error: 'Missing data' });
      }
      if (parentId !== 0) {
        const parentFolder = await collection.findOne({
          _id: ObjectId(parentId),
        });
        if (!parentFolder) {
          return res.status(400).send({ error: 'Parent not found' });
        }
        if (parentFolder.type !== 'folder') {
          return res.status(400).send({ error: 'Parent is not a folder' });
        }
      }
      const DataToInsert = {
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      };
      if (type === 'folder') {
        await collection.insertOne(DataToInsert);
        return res.status(201).send({
          id: DataToInsert._id,
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }
      const fileName = uuidv4();
      const decodedData = Buffer.from(data, 'base64');
      const filePath = `${dir}/${fileName}`;
      mkdir(dir, { recursive: true }, (error) => {
        if (error) {
          return res.status(400).send({ error: error.message });
        }
        return true;
      });
      writeFile(filePath, decodedData, (error) => {
        if (error) {
          return res.status(400).send({ error: error.message });
        }
        return true;
      });
      DataToInsert.localPath = filePath;
      await collection.insertOne(DataToInsert);

      return res.status(201).send({
        id: DataToInsert._id,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async getShow(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUser({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const collection = await dbClient.db.collection('files');
      const fileId = req.params.id || '';
      const file = await collection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });
      if (!file) {
        return res.status(404).send({ error: 'Not found' });
      }
      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async getIndex(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const collection = await dbClient.db.collection('files');
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const user = await dbClient.findUser({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      let parentId = req.query.parentId || 0;
      const page = req.query.page || 0;

      if (parentId === '0') parentId = 0;
      if (parentId !== 0) {
        const folder = await collection.findOne({ _id: ObjectId(parentId) });

        if (!folder || folder.type !== 'folder') {
          return res.status(200).send([]);
        }
      }
      const aggrigated = { $and: [{ parentId }] };
      let aggrigatedData = [
        { $match: aggrigated },
        { $skip: page * 20 },
        { $limit: 20 },
      ];
      if (parentId === 0) {
        aggrigatedData = [{ $skip: page * 20 }, { $limit: 20 }];
      }

      const pageFiles = await collection.aggregate(aggrigatedData);
      const files = [];

      await pageFiles.forEach((file) => {
        const fileObj = {
          id: file._id,
          userId: file.userId,
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId: file.parentId,
        };
        files.push(fileObj);
      });

      return res.status(200).send(files);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const collection = await dbClient.db.collection('files');
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUser({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const fileId = req.params.id || '';

      let file = await collection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });
      if (!file) return res.status(404).send({ error: 'Not found' });

      await collection.updateOne(
        { _id: ObjectId(fileId) },
        { $set: { isPublic: true } },
      );
      file = await collection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });

      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async putUnpublish(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const collection = await dbClient.db.collection('files');
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUser({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const fileId = req.params.id || '';
      let file = await collection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });
      if (!file) return res.status(404).send({ error: 'Not found' });

      await collection.updateOne(
        { _id: ObjectId(fileId) },
        { $set: { isPublic: false } },
      );
      file = await collection.findOne({
        _id: ObjectId(fileId),
        userId: user._id,
      });

      return res.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async getFile(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const collection = dbClient.db.collection('files');
    const fileId = req.params.id || '';
    const size = req.query.size || 0;

    const file = await collection.findOne({ _id: ObjectId(fileId) });
    if (!file) return res.status(404).send({ error: 'Not found' });

    const { isPublic, userId, type } = file;

    const key = `auth_${token}`;
    let user = await redisClient.get(key);
    user = user._id;
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (
      (!isPublic && !user) || (user && userId.toString() !== user && !isPublic)
    ) {
      return res.status(404).send({ error: 'Not found' });
    }
    if (type === 'folder') {
      return res.status(400).send({ error: "A folder doesn't have content" });
    }

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

    try {
      const fileData = readFileSync(path);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileData);
    } catch (err) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
