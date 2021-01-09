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
import { AssociatedProduct } from '../models/internal/associated-product';

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
		// walidacje na razie na podstawie joi()
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

		this.finalize(res, this.productMapper.toWebProduct(updatedProduct), StatusCodes.OK);
	};

	public readonly getProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const internalProduct: InternalProduct = this.productQueries.getProduct(uuid);


		if (_.isNil(internalProduct)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

		this.finalize(res, this.productMapper.toWebProduct(internalProduct), StatusCodes.OK);
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
		const productUuidToDelete: string = req.pathParams.uuid;
		const userUuid: string = req.pathParams.userUuid;
		const container: Container = this.productQueries.findContainer(userUuid);

		const fullInternalProduct: InternalProduct = this.productQueries.getFullProduct(productUuidToDelete);

		if (_.isNil(fullInternalProduct) || !container.products.includes(fullInternalProduct.uuid)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

		if (_.isEmpty(fullInternalProduct.associatedProducts)) {
			this.productQueries.deleteFullProduct(productUuidToDelete, container.uuid);
		} else {
			this.deleteSubproduct(fullInternalProduct, container, productUuidToDelete);
		}
	};

	private deleteSubproduct = (fullInternalProduct: InternalProduct, container: Container, productUuidToDelete: string): void => {
		const updatedProduct: InternalProduct = _.cloneDeep(fullInternalProduct);
		const updateContainer: Container = _.cloneDeep(container);

		if (fullInternalProduct.uuid === productUuidToDelete) {
			const newRootProduct: AssociatedProduct = updatedProduct.associatedProducts.pop();
			_.merge(updatedProduct, {...newRootProduct});
			updateContainer.products = updateContainer.products.map(productUuid => productUuid === productUuidToDelete ? updatedProduct.uuid : productUuid);
		} else {
			updatedProduct.associatedProducts = _.remove(updatedProduct.associatedProducts,
				(associatedProduct) => associatedProduct.uuid !== productUuidToDelete);
		}

		this.productQueries.updateProduct(updatedProduct);
		this.productQueries.updateContainer(updateContainer);
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

	private readonly emptyOrChanged = (firstProduct: Product | InternalProduct, secondProduct: Product | InternalProduct, fieldPath: string): boolean => {
		const firstProductField: any = _.get(firstProduct, fieldPath, null);
		const secondProductField: any = _.get(secondProduct, fieldPath, null);
		return this.empty(firstProduct, fieldPath) || !_.eq(firstProductField, secondProductField);
	};

	private readonly empty = (product: Product | InternalProduct, fieldPath: string): boolean => {
		const productField = _.get(product, fieldPath, null);
		return _.isNil(productField);
	};

	private readonly isGreater = (product: Product | InternalProduct, fieldPath: string, comparedValue: number): boolean => {
		const productField: any = _.get(product, fieldPath, 0);
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