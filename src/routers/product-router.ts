import { createRouter } from '@arangodb/foxx';
import * as joi from 'joi';
import { container } from '../config-ioc/container';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { ProductService } from '../services/default-product-service';
import { ProductModel } from '../models/web/product/product';
import { ProductCardModel } from '../models/web/product/product-card';
import { ContainerModel } from '../models/internal/container';
import { SharedInfoModel } from '../models/web/user/shared-info';
import { OutdatedProductWithUserDataModel } from '../models/web/product/outdatedProductWithUserData';
import { QueryFilterModel } from '../models/web/filters/query-filter';
import { SynchronizeResponseModel } from '../models/web/product/synchronizeResponse';

const MIME_TYPE: string = 'application/json';
const TAG: string = 'Products';
const uuidSchema = joi.string().required().description('Product uuid');
const barcodeSchema = joi.string().required().description('Product barcode');
const userUuidSchema = joi.string().required().description('User uuid');
const containerUuidSchema = joi.string().required().description('Container uuid');

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

	foxxRouter.post(':userUuid/bulk', productService.addProducts, 'addProducts')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.body([new ProductModel()], [MIME_TYPE])
		.response(StatusCodes.CREATED, [new ProductModel()], [MIME_TYPE], 'Product response model')
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

	foxxRouter.put(':userUuid/synchronizeAll', productService.synchronizeAll, 'synchronizeAll')
		.tag(TAG)
		.body([new ProductModel()], [MIME_TYPE])
		.response(StatusCodes.OK, [new SynchronizeResponseModel()], [MIME_TYPE], 'Products response model')
		.response(StatusCodes.BAD_REQUEST, [MIME_TYPE])
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns synchronized product.')
		.description(`Returns synchronized product.`);

	foxxRouter.get(':uuid', productService.getProduct, 'getProduct')
		.tag(TAG)
		.pathParam('uuid', uuidSchema)
		.response(StatusCodes.CREATED, new ProductModel(), [MIME_TYPE], 'Product response model')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns created product with uuid.')
		.description(`Returns created product with uuid.`);

	foxxRouter.get('outdated', productService.getOutdatedProducts, 'getOutdatedProducts')
		.tag(TAG)
		.response(StatusCodes.OK, [new OutdatedProductWithUserDataModel()], [MIME_TYPE], 'List of products')
		.summary('Returns all outdated products.')
		.description(`Returns all outdated products.`);

	foxxRouter.post(':userUuid/all', productService.getAllProducts, 'getAllProducts')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.body(new QueryFilterModel(), [MIME_TYPE])
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

	foxxRouter.get('global/:barcode', productService.findProductCard, 'findProductCard')
		.tag(TAG)
		.pathParam('barcode', barcodeSchema)
		.response(StatusCodes.CREATED, new ProductCardModel(), [MIME_TYPE], 'Global product card response model')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns Global product card with barcode.')
		.description(`Returns Global product card with barcode.`);

	foxxRouter.put('global/synchronizeAll', productService.synchronizeAllGlobalCards, 'synchronizeAllGlobalCards')
		.tag(TAG)
		.summary('Synchronizes all global cards.')
		.description(`Synchronizes all global cards.`);

	foxxRouter.get('containers/:userUuid', productService.getContainer, 'getContainer')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.response(StatusCodes.OK, new ContainerModel(), [MIME_TYPE], 'User container model')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Returns User container model.')
		.description(`Returns User container model.`);

	foxxRouter.get('containers/sharedInfo/:userUuid', productService.getContainerSharedInfo, 'getContainerSharedInfo')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.response(StatusCodes.OK, new SharedInfoModel(), [MIME_TYPE], 'Container shared info model')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.response(StatusCodes.CONFLICT, [MIME_TYPE])
		.summary('Returns container shared info model.')
		.description(`Returns container shared info model.`);

	foxxRouter.put('containers/share/:userUuid/:targetContainerUuid', productService.shareContainer, 'shareContainer')
		.tag(TAG)
		.pathParam('userUuid', userUuidSchema)
		.pathParam('targetContainerUuid', containerUuidSchema)
		.response(StatusCodes.OK, [MIME_TYPE], 'Container shared info model')
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE])
		.summary('Share user container.')
		.description(`Share user container.`);

	return foxxRouter;
})();
