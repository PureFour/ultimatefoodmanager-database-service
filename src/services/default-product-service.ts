import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { ProductQueries } from '../queries/default-product-queries';
import { ProductMapper } from '../mappers/default-product-mapper';
import { InternalProduct } from '../models/internal/internal-product';
import { Container } from '../models/internal/container';
import { Product } from '../models/web/product';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries,
		@inject(IDENTIFIER.PRODUCT_MAPPER) private readonly productMapper: ProductMapper,
	) {
	}

	// TODO dodać nowa kolekcje produktów (kart. prod) i trzymać tam globalne dane produktowe
	// products stanie sie lokalna kolekcja dla użytkowników

	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		// TODO dodać walidacje
		const productToAdd: InternalProduct = this.productMapper.toInternalProduct(req.body);
		const userUuid: string = req.pathParams.userUuid;

		let container: Container = this.productQueries.findContainer(userUuid);
		if (_.isNil(container)) {
			container = this.productQueries.createContainer(userUuid);
		}

		const dbProduct: InternalProduct = this.productQueries.findProduct(productToAdd.barcode);

		const createdProduct: InternalProduct = this.hasProduct(container, dbProduct) ?
			this.productQueries.addAssociatedProduct(dbProduct.uuid, this.productMapper.toAssociatedProduct(productToAdd))
			: this.productQueries.addProduct(productToAdd, container.uuid);

		this.finalize(res, this.productMapper.toWebProduct(createdProduct), StatusCodes.CREATED);
	};


	public updateProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const newProduct: Product = req.body;

		if (_.isNil(newProduct.uuid)) {
			res.throw(StatusCodes.BAD_REQUEST, 'Product uuid must be filled!');
		}
		const oldProduct: InternalProduct = this.productQueries.getProduct(newProduct.uuid);

		this.validateProductToUpdate(newProduct, oldProduct, res);

		const updatedProduct: InternalProduct = this.productMapper.toUpdatedFullProduct(this.productQueries.getFullProduct(newProduct.uuid), newProduct);

		this.productQueries.updateProduct(updatedProduct);
	};

	public readonly getProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const product: InternalProduct = this.productQueries.getProduct(uuid);


		if (_.isNil(product)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

		this.finalize(res, this.productMapper.toWebProduct(product), StatusCodes.OK);
	};

	public readonly getAllProducts = (req: Foxx.Request, res: Foxx.Response): void => {
		const userUuid: string = req.pathParams.userUuid;
		const container: Container = this.productQueries.findContainer(userUuid);
		if (_.isNil(container)) {
			res.send([]);
			return;
		}
		const products: InternalProduct[] = container.products.map(productUuid => this.productQueries.getAllProductsWithinProduct(productUuid)).flat(2);
		this.finalize(res, products.map(product => this.productMapper.toWebProduct(product)), StatusCodes.OK);
	};

	public readonly deleteProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const userUuid: string = req.pathParams.userUuid;
		const container: Container = this.productQueries.findContainer(userUuid);

		if (_.isNil(this.productQueries.deleteProduct(uuid, container.uuid))) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

	};

	private readonly hasProduct = (container: Container, product: InternalProduct): boolean => {
		return !_.isNil(product) && _.includes(container.products, product.uuid);
	};

	private readonly validateProductToUpdate = (newProduct: Product, oldProduct: InternalProduct, res: Foxx.Response): void => {
		if (this.emptyOrChanged(newProduct, oldProduct, 'barcode')) {
			res.throw(StatusCodes.BAD_REQUEST, 'barcode is unmodifiable!');
		}

		if (this.emptyOrChanged(newProduct, oldProduct, 'metadata.createdDate')) {
			res.throw(StatusCodes.BAD_REQUEST, 'createdDate is unmodifiable!');
		}

		if (this.isGreater(newProduct, 'quantity', oldProduct.totalQuantity)) {
			res.throw(StatusCodes.BAD_REQUEST, 'quantity should be lesser than totalQuantity!');
		}
	};

	private readonly emptyOrChanged = (firstProduct: Product | InternalProduct, secondProduct: Product | InternalProduct, valuePath: string): boolean => {
		const firstProductField: any = _.get(firstProduct, valuePath, null);
		const secondProductField: any = _.get(secondProduct, valuePath, null);
		return _.isNil(firstProductField) || !_.eq(firstProductField, secondProductField);
	};

	private readonly isGreater = (product: Product | InternalProduct, valuePath: string, comparedValue: number): boolean => {
		const productField: any = _.get(product, valuePath, 0);
		return productField > comparedValue;
	};

	private finalize = (res, payload, status) => {
		res.status(status);
		res.send(payload);
	};
}

export interface ProductService {
	addProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	updateProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getAllProducts: (req: Foxx.Request, res: Foxx.Response) => void;
	deleteProduct: (req: Foxx.Request, res: Foxx.Response) => void;
}