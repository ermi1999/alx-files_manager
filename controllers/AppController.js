import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AppController = {
  getStatus: (req, res) => {
    try {
      const redis = redisClient.isAlive();
      const mongo = dbClient.isAlive();
      res.status(200).send({ redis, mongo });
    } catch (error) {
      console.log(error);
    }
  },

  getStats: async (req, res) => {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();
      res.status(200).send({ users, files });
    } catch (error) {
      console.log(error);
    }
  },
};

export default AppController;
