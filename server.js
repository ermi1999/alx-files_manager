import express from 'express';
import process from 'process';
import routeController from './routes/index';

const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
routeController(app);

app.listen(port);

export default app;
