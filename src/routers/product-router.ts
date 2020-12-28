import { createRouter } from '@arangodb/foxx';
import * as joi from 'joi';
import { container } from '../config-ioc/container';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { ProductService } from '../services/default-product-service';
import { ProductModel } from '../models/web/product';

const MIME_TYPE: string = 'application/json';
const TAG: string = 'Products';
const uuidSchema = joi.string().required().description('Product uuid');
const userUuidSchema = joi.string().required().description('User uuid');

export const router: Foxx.Router = (() => {

	const foxxRouter = createRouter();

	const productService: ProductService = container.get<ProductService>(IDENTIFIER.PRODUCT_SERVICE);

	foxxRouter.post(':userUuid', productService.addProduct, 'addProduct')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.body(new ProductModel(), [MIME_TYPE])
		.response(StatusCodes.CREATED, new ProductModel(), [MIME_TYPE], 'Product response model')
		.response(StatusCodes.BAD_REQUEST, [MIME_TYPE])
		.response(StatusCodes.CONFLICT, [MIME_TYPE])
		.summary('Returns created product with uuid.')
		.description(`Returns created product with uuid.`);

	foxxRouter.put(productService.updateProduct, 'updateProduct')
		.tag(TAG)
		.body(new ProductModel(), [MIME_TYPE])
		.response(StatusCodes.OK, new ProductModel(), [MIME_TYPE], 'Product response model')
		.response(StatusCodes.BAD_REQUEST, [MIME_TYPE])
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns updated product.')
		.description(`Returns updated product.`);

	foxxRouter.get(':uuid', productService.getProduct, 'getProduct')
		.tag(TAG)
		.pathParam('uuid', uuidSchema)
		.response(StatusCodes.CREATED, new ProductModel(), [MIME_TYPE], 'Product response model')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns created product with uuid.')
		.description(`Returns created product with uuid.`);

	foxxRouter.get(':userUuid/all', productService.getAllProducts, 'getAllProducts')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.response(StatusCodes.CREATED, [new ProductModel()], [MIME_TYPE], 'List of products')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns all created products.')
		.description(`Returns all created products.`);

	foxxRouter.delete(':userUuid/:uuid', productService.deleteProduct, 'deleteProduct')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.pathParam('uuid', uuidSchema)
		.summary('Deletes product with uuid.')
		.description(`Deletes product with uuid.`);

	return foxxRouter;
})();
