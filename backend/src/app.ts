import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';

export const createApp = (): Application => {
  const app = express();

  const origins = config.corsOrigin.includes(',')
    ? config.corsOrigin.split(',').map((o) => o.trim())
    : config.corsOrigin;

  app.use(
    cors({
      origin: origins,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestLogger);

  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
};

export const app = createApp();
