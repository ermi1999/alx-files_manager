import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const EmailAndPassword = Buffer.from(authHeader.slice(6), 'base64')
        .toString()
        .split(':');
      console.log(EmailAndPassword);

      if (!EmailAndPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const email = EmailAndPassword[0];
      const password = sha1(EmailAndPassword[1]);

      const collection = await dbClient.db.collection('users');
      const user = await collection.findOne({ email, password });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (password !== user.password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;

      await redisClient.set(key, user._id.toString(), 86400);

      return res.status(200).json({ token });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      const token = req.get('X-Token');

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await redisClient.del(`auth_${token}`);
      return res.status(204);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

export default AuthController;
