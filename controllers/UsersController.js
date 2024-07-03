import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
    }
    const hashedPass = sha1(password);

    try {
      const collection = await dbClient.db.collection('users');
      const user = await collection.findOne({ email });

      if (user) {
        res.status(400).json({ error: 'Already exist' });
      } else {
        collection.insertOne({ email, password: hashedPass });
        const _user = await collection.findOne({ email });
        res.status(201).json({ id: _user._id, email: _user.email });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
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

      const collection = await dbClient.db.collection('users');
      if (!collection) {
        res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await collection.findOne({ _id: userId });
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
      }

      res.status(200).json({ id: userId, email: user.email });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
