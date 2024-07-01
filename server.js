import express from 'express';
import process from 'process';
import routeController from './routes/index';

const port = process.env.PORT || 5000;
const app = express();

routeController(app);

app.listen(port);

export default app;
