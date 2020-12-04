import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { Product, ProductModel } from '../models/web/product';
import { StatusCodes } from 'http-status-codes';
import { ProductQueries } from '../queries/default-product-queries';
import { UTILS_SERVICE } from './util-service';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries
	) {}

	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		// TODO dodac walidacje
		const product: Product = {uuid: UTILS_SERVICE.generateUuid(), ...req.body};
		const dbProduct: Product = this.productQueries.findProduct(product.barcode);

		if (!_.isNil(dbProduct)) {
			res.throw(StatusCodes.CONFLICT, 'Product already exists');
		}
		const createdProduct: Product = this.productQueries.addProduct(product);
		this.finalize(res, new ProductModel().forClient(createdProduct), StatusCodes.CREATED);
	};

	public readonly getProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const product: Product = this.productQueries.getProduct(uuid);


		if (_.isNil(product)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

		this.finalize(res, new ProductModel().forClient(product), StatusCodes.OK);
	};

	public readonly getAllProducts = (_req: Foxx.Request, res: Foxx.Response): void => {
		const products: Product[] = this.productQueries.getAllProducts();
		this.finalize(res, products.map(product => new ProductModel().forClient(product)), StatusCodes.OK);
	};

	public readonly deleteProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;

		if (_.isNil(this.productQueries.deleteProduct(uuid))) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

	};

	private finalize = (res, payload, status) => {
		res.status(status);
		res.send(payload);
	};
}

export interface ProductService {
	addProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getAllProducts: (req: Foxx.Request, res: Foxx.Response) => void;
	deleteProduct: (req: Foxx.Request, res: Foxx.Response) => void;
}