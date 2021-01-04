import * as userRouter from './routers/user-router';
import * as productRouter from './routers/product-router';
import * as mediaRouter from './routers/media-router';

module.context.use('users', userRouter.router, 'users');
module.context.use('products', productRouter.router, 'products');
module.context.use('media', mediaRouter.router, 'media');
