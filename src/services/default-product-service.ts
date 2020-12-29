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
import { ProductCard } from '../models/web/product-card';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries,
		@inject(IDENTIFIER.PRODUCT_MAPPER) private readonly productMapper: ProductMapper,
	) {
	}

	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		// walidacje na razie na podstawie joi()
		const productToAdd: InternalProduct = this.productMapper.toInternalProduct(req.body);
		const userUuid: string = req.pathParams.userUuid;

		this.handleGlobalProductCard(productToAdd.productCard);

		let container: Container = this.productQueries.findContainer(userUuid);
		if (_.isNil(container)) {
			container = this.productQueries.createContainer(userUuid);
		}

		const dbProduct: InternalProduct = this.productQueries.findProduct(container.products, productToAdd.productCard.barcode);

		const createdProduct: InternalProduct = this.hasProduct(container, dbProduct) ?
			this.addAssociatedProduct(dbProduct, productToAdd, res)
			: this.productQueries.addProduct(productToAdd, container.uuid);

		this.finalize(res, this.productMapper.toWebProduct(createdProduct), StatusCodes.CREATED);
	};

	private addAssociatedProduct = (dbProduct: InternalProduct, newProduct: InternalProduct, res: Foxx.Response): InternalProduct => {
		this.validateProductToUpdate(newProduct, dbProduct, res);

		const newAssociatedProduct: AssociatedProduct = this.productMapper.toAssociatedProduct(newProduct);

		const updatedProduct: InternalProduct = {
			...dbProduct,
			productCard: {...dbProduct.productCard, ...newProduct.productCard},
			associatedProducts: [...dbProduct.associatedProducts, newAssociatedProduct]
		};

		this.productQueries.updateProduct(updatedProduct);

		return updatedProduct;
	};

	public updateProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const newProduct: Product = req.body;

		if (_.isNil(newProduct.uuid)) {
			res.throw(StatusCodes.BAD_REQUEST, 'Product uuid must be filled!');
		}
		const oldProduct: InternalProduct = this.productQueries.getProduct(newProduct.uuid);

		this.validateProductToUpdate(newProduct, oldProduct, res);
		this.handleGlobalProductCard(newProduct.productCard);

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

	public readonly findProductCard = (req: Foxx.Request, res: Foxx.Response): void => {
		const productCard: ProductCard = this.productQueries.findGlobalProductCard(req.pathParams.barcode);

		if (_.isNil(productCard)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found');
		}

		this.finalize(res, productCard, StatusCodes.OK);
	};

	private handleGlobalProductCard = (newProductCard: ProductCard): void => {
		const dbProductCard = this.productQueries.findGlobalProductCard(newProductCard.barcode);

		if (_.isNil(dbProductCard)) {
			this.productQueries.addGlobalProductCard(newProductCard);
		} else {
			const updatedProductCard: ProductCard = this.mergeOnlyEmptyFields(dbProductCard, newProductCard);
			this.productQueries.updateGlobalProductCard(updatedProductCard);
		}
	};

	private mergeOnlyEmptyFields = (target: any, source: any): any => {
		Object.keys(target).forEach(targetKey => {
			const targetField: any = target[targetKey];
			const sourceField: any = source[targetKey];
			target[targetKey] = typeof targetField === 'object' ?
				this.mergeOnlyEmptyFields(targetField, sourceField) : this.mergeFieldIfEmpty(targetField, sourceField);
		});
		return target;
	};

	private mergeFieldIfEmpty = (targetField: any, sourceField: any): any => {
		return this.isEmpty(targetField) && !this.isEmpty(sourceField) ? sourceField : targetField;
	};

	private readonly isEmpty = (value: any): boolean => {
		return typeof value !== 'object' && _.isNil(value) ||
			value === 0 || // TODO do przemyślenia czy to jest poprawne!
			value === 'NOT_FOUND' ||
			value === '';
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

	private readonly validateProductToUpdate = (newProduct: Product | InternalProduct, oldProduct: InternalProduct, res: Foxx.Response): void => {
		if (this.nilOrChanged(newProduct, oldProduct, 'productCard.barcode')) {
			res.throw(StatusCodes.BAD_REQUEST, 'barcode is unmodifiable!');
		}

		if (this.nilOrChanged(newProduct, oldProduct, 'metadata.createdDate')) {
			res.throw(StatusCodes.BAD_REQUEST, 'createdDate is unmodifiable!');
		}

		if (this.isGreater(newProduct, 'quantity', oldProduct.productCard.totalQuantity)
			&& this.isGreater(newProduct, 'quantity', newProduct.productCard.totalQuantity)) {
			res.throw(StatusCodes.BAD_REQUEST, 'quantity should be lesser than totalQuantity!');
		}
	};

	private readonly nilOrChanged = (firstProduct: Product | InternalProduct, secondProduct: Product | InternalProduct, fieldPath: string): boolean => {
		const firstProductField: any = _.get(firstProduct, fieldPath, null);
		const secondProductField: any = _.get(secondProduct, fieldPath, null);
		return this.isNil(firstProduct, fieldPath) || !_.eq(firstProductField, secondProductField);
	};

	private readonly isNil = (product: Product | InternalProduct, fieldPath: string): boolean => {
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
	findProductCard: (req: Foxx.Request, res: Foxx.Response) => void;
}