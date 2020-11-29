import * as userRouter from './routers/user-router';
import * as productRouter from './routers/product-router';

module.context.use('users', userRouter.router, 'users');
module.context.use('products', productRouter.router, 'products');
