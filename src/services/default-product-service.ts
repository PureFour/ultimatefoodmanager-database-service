import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { ProductQueries } from '../queries/default-product-queries';
import { ProductMapper } from '../mappers/default-product-mapper';
import { InternalProduct } from '../models/internal/internal-product';
import { Container } from '../models/internal/container';

const mockedUserUuid: string = 'f29389e8-8d33-4322-840f-acb5b67d7831';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries,
		@inject(IDENTIFIER.PRODUCT_MAPPER) private readonly productMapper: ProductMapper,
	) {
	}

	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		// TODO dodac walidacje
		const productToAdd: InternalProduct = this.productMapper.toInternalProduct(req.body);
		const userUuid: string = this.extractUserUuid();

		let container: Container = this.productQueries.findContainer(userUuid);
		if (_.isNil(container)) {
			container = this.productQueries.createContainer(userUuid);
		}

		const dbProduct: InternalProduct = this.productQueries.findProduct(productToAdd.barcode);

		const createdProduct: InternalProduct = _.isNil(dbProduct) ? this.productQueries.addProduct(productToAdd, container.uuid)
			: this.productQueries.addAssociatedProduct(dbProduct.uuid, this.productMapper.toAssociatedProduct(productToAdd));

		this.finalize(res, this.productMapper.toWebProduct(createdProduct), StatusCodes.CREATED);
	};

	public readonly getProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const product: InternalProduct = this.productQueries.getProduct(uuid);


		if (_.isNil(product)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

		this.finalize(res, this.productMapper.toWebProduct(product), StatusCodes.OK);
	};

	public readonly getAllProducts = (_req: Foxx.Request, res: Foxx.Response): void => {
		const userUuid: string = this.extractUserUuid();
		const container: Container = this.productQueries.findContainer(userUuid);
		if (_.isNil(container)) {
			res.send([]);
			return;
		}
		const products: InternalProduct[] = container.products.map(productUuid => this.productQueries.getAllProducts(productUuid)).flat(2);
		this.finalize(res, products.map(product => this.productMapper.toWebProduct(product)), StatusCodes.OK);
	};

	public readonly deleteProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const userUuid: string = this.extractUserUuid();
		const container: Container = this.productQueries.findContainer(userUuid);

		if (_.isNil(this.productQueries.deleteProduct(uuid, container.uuid))) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

	};

	private finalize = (res, payload, status) => {
		res.status(status);
		res.send(payload);
	};

	// do zmiany po wprowadzeniu tokenow!
	/* @deprecated */
	private readonly extractUserUuid = (_token?: string): string => {
		return mockedUserUuid;
	};
}

export interface ProductService {
	addProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getAllProducts: (req: Foxx.Request, res: Foxx.Response) => void;
	deleteProduct: (req: Foxx.Request, res: Foxx.Response) => void;
}