import * as sampleRouter from './routers/sample-router';

module.context.use('/sample', sampleRouter.router, 'sample');
