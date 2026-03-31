import 'dotenv/config';
import { ensureWorkerDependenciesReady } from './src/services/startup.service.js';
import logger from './src/utils/logger.js';

const startWorkers = async () => {
  try {
    const readiness = await ensureWorkerDependenciesReady();

    await Promise.all([
      import('./src/workers/submission.worker.js'),
      import('./src/workers/contest.worker.js'),
    ]);

    logger.info({ readiness }, 'EvalX workers running');
  } catch (error) {
    logger.fatal({ err: error?.message || error }, 'Failed worker startup readiness checks');
    process.exit(1);
  }
};

startWorkers();
