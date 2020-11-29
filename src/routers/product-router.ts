import {createRouter} from '@arangodb/foxx';
import {container} from '../config-ioc/container';
import IDENTIFIER from '../config-ioc/identifiers';
import {StatusCodes} from 'http-status-codes';
import {ProductService} from '../services/default-product-service';
import { ProductModel } from '../models/web/product';

const MIME_TYPE = 'application/json';

export const router: Foxx.Router = (() => {

	const foxxRouter = createRouter();

	const productService : ProductService = container.get<ProductService>(IDENTIFIER.PRODUCT_SERVICE);

	foxxRouter.post(productService.addProduct, 'addProduct')
		.body(new ProductModel(), [MIME_TYPE])
		.response(StatusCodes.CREATED, new ProductModel(), [MIME_TYPE], 'Product response model')
		.response(StatusCodes.BAD_REQUEST, [MIME_TYPE])
		.response(StatusCodes.CONFLICT, [MIME_TYPE])
		.summary('Returns created product with uuid.')
		.description(`Returns created product with uuid.`);


	return foxxRouter;
})();
