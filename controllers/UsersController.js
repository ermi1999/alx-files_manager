import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const hashedPass = sha1(password);

    try {
      const collection = await dbClient.db.collection('users');
      const user = await collection.findOne({ email });

      if (user) {
        return res.status(400).json({ error: 'Already exist' });
      }
      collection.insertOne({ email, password: hashedPass });
      const _user = await collection.findOne({ email });
      return res.status(201).json({ id: _user._id, email: _user.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    try {
      const token = req.get('X-Token');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const key = `auth_${token}`;

      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUser({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.json({ id: userId._id, email: user.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Sreturn erver error' });
    }
  }
}

export default UsersController;
