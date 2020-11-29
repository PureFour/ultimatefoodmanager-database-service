import {inject, injectable} from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import {Product} from '../models/web/product';
import {StatusCodes} from 'http-status-codes';
import {ProductQueries} from '../queries/default-product-queries';
import { UTILS_SERVICE } from './util-service';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries
	) {}

	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		// TODO dodac walidacje
		const product: Product = {uuid: UTILS_SERVICE.generateUuid() , ...req.body};
		const dbProduct: Product = this.productQueries.findProduct(product.name);

		if (!_.isNil(dbProduct)) {
			res.throw(StatusCodes.CONFLICT, 'Product already exists');
		}
		const createdProduct: Product = this.productQueries.addProduct(product);
		this.finalize(res, createdProduct, StatusCodes.CREATED);
	}

	private finalize = (res, payload, status) => {
		res.status(status);
		res.send(payload);
	};
}

export interface ProductService {
	addProduct: (req: Foxx.Request, res: Foxx.Response) => void;
}