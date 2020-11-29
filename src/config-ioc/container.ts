import {Container} from 'inversify';
import { DefaultUserService, UserService } from '../services/default-user-service';
import IDENTIFIER from './identifiers';
import { DefaultUserQueries, UserQueries } from '../queries/default-user-queries';
import { DefaultUserMapper, UserMapper } from '../mappers/default-user-mapper';
import {DefaultProductService, ProductService} from '../services/default-product-service';
import {DefaultProductQueries, ProductQueries} from '../queries/default-product-queries';

export const container = new Container();

container.bind<UserService>(IDENTIFIER.USER_SERVICE).to(DefaultUserService);
container.bind<UserQueries>(IDENTIFIER.USER_QUERIES).to(DefaultUserQueries);
container.bind<UserMapper>(IDENTIFIER.USER_MAPPER).to(DefaultUserMapper);

container.bind<ProductService>(IDENTIFIER.PRODUCT_SERVICE).to(DefaultProductService);
container.bind<ProductQueries>(IDENTIFIER.PRODUCT_QUERIES).to(DefaultProductQueries);