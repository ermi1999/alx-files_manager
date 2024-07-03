import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.get('X-Token');
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUser({ _id: userId });
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
      }
      const { name } = req.body;
      const { type } = req.body;
      const { parentId } = req.body || 0;
      const { isPublic } = req.body || false;
      const { data } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Missing name' });
      }
      if (!type) {
        res.status(400).json({ error: 'Missing type' });
      }
      const fileTypes = ['folder', 'file', 'image'];
      if (!fileTypes.includes(type)) {
        res.status(400).json({ error: 'Missing type' });
      }
      if (!data && type !== 'folder') {
        res.status(400).json({ error: 'Missing data' });
      }
      if (type === 'folder') {
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}
