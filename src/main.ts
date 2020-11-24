import * as userRouter from './routers/user-router';

module.context.use('users', userRouter.router, 'users');
