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
import { User } from '../models/web/user';
import { UserQueries } from '../queries/default-user-queries';
import { SharedInfo } from '../models/web/shared-info';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries,
		@inject(IDENTIFIER.USER_QUERIES) private readonly userQueries: UserQueries,
		@inject(IDENTIFIER.PRODUCT_MAPPER) private readonly productMapper: ProductMapper,
	) {
	}

	// TODO zmienić dodawanie do container dla każdej instancji nawet podProduktu!
	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		// walidacje na razie na podstawie joi()
		const productToAdd: InternalProduct = this.productMapper.toInternalProduct(req.body);
		const userUuid: string = req.pathParams.userUuid;

		this.handleGlobalProductCard(productToAdd.productCard);

		const container: Container = this.productQueries.findContainer(userUuid);

		const dbProduct: InternalProduct = this.findProductByBarcode(
			[...container.ownerProducts, ...container.sharedProducts],
			productToAdd.productCard.barcode);
		const createdProduct: InternalProduct = _.isNil(dbProduct) ?
			this.productQueries.addProduct(productToAdd, container.uuid)
			: this.addAssociatedProduct(dbProduct, productToAdd, container, res);

		this.finalize(res, this.productMapper.toWebProduct(createdProduct), StatusCodes.CREATED);
	};

	private readonly findProductByBarcode = (containerProductsUuids: string[], barcode: string): InternalProduct => {
		for (const productUuid of containerProductsUuids) {
			const product: InternalProduct = this.productQueries.getFullProduct(productUuid);
			if (product.productCard.barcode === barcode) {
				return product;
			}
		}
		return null;
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
			res.throw(StatusCodes.NOT_FOUND, 'Product not found!');
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
		const products: InternalProduct[] = this.getAllProductsFromContainer(container);
		this.finalize(res, products.map(product => this.productMapper.toWebProduct(product)), StatusCodes.OK);
	};

	public readonly deleteProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const productUuidToDelete: string = req.pathParams.uuid;
		const userUuid: string = req.pathParams.userUuid;
		const container: Container = this.findContainerWithProduct(userUuid, productUuidToDelete);

		const fullInternalProduct: InternalProduct = this.productQueries.getFullProduct(productUuidToDelete);

		if (_.isNil(fullInternalProduct) || _.isNil(container)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product or container not found!');
		}

		if (_.isEmpty(fullInternalProduct.associatedProducts)) {
			this.productQueries.deleteFullProduct(productUuidToDelete, container.uuid, this.isProductShared(fullInternalProduct, productUuidToDelete));
		} else {
			this.deleteSubproduct(fullInternalProduct, container, productUuidToDelete);
		}
	};

	private readonly findContainerWithProduct = (ownerUuid: string, productUuid: string): Container => {
		const requestCallerContainer: Container = this.productQueries.findContainer(ownerUuid);

		if (this.hasProductInContainer(requestCallerContainer, productUuid)) {
			return requestCallerContainer;
		}

		for (const sharingUserUuid of requestCallerContainer.usersUuids) {
			const sharingUserContainer: Container = this.productQueries.findContainer(sharingUserUuid);
			if (_.includes(sharingUserContainer.sharedProducts, productUuid)) {
				return sharingUserContainer;
			}
		}

		return null;
	};

	public readonly findProductCard = (req: Foxx.Request, res: Foxx.Response): void => {
		const productCard: ProductCard = this.productQueries.findGlobalProductCard(req.pathParams.barcode);

		if (_.isNil(productCard)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found!');
		}

		this.finalize(res, productCard, StatusCodes.OK);
	};

	// TODO przenieść do osobnego serwisu!
	public readonly getContainer = (req: Foxx.Request, res: Foxx.Response): void => {

		const container: Container = this.productQueries.findContainer(req.pathParams.userUuid);

		if (_.isNil(container)) {
			res.throw(StatusCodes.NOT_FOUND, 'Container not found!');
		}

		this.finalize(res, container, StatusCodes.OK);
	};
	public readonly getContainerSharedInfo = (req: Foxx.Request, res: Foxx.Response): void => {
		const container: Container = this.productQueries.findContainer(req.pathParams.userUuid);

		if (_.isNil(container)) {
			res.throw(StatusCodes.NOT_FOUND, 'Container not found!');
		}

		const sharingUsers: User[] = container.usersUuids.map(userUuid => this.userQueries.getUser(userUuid));

		const totalOwnedProducts: number = container.ownerProducts.length;

		const totalSharedProducts: number = container.sharedProducts.length;

		this.finalize(res, <SharedInfo>{sharingUsers, totalSharedProducts, totalOwnedProducts}, StatusCodes.OK);
	};

	public readonly shareContainer = (req: Foxx.Request, res: Foxx.Response): void => {
		const container: Container = this.productQueries.findContainer(req.pathParams.userUuid);
		const targetContainer: Container = this.productQueries.getContainer(req.pathParams.targetContainerUuid);

		this.validateContainersToBeShared(container, targetContainer, res);

		container.usersUuids.push(targetContainer.ownerUuid);
		targetContainer.usersUuids.push(container.ownerUuid);

		this.productQueries.updateContainer(container);
		this.productQueries.updateContainer(targetContainer);
	};

	private readonly getAllProductsFromContainer = (container: Container): InternalProduct[] => {
		return this.getAllProductsUuidsFromContainer(container).map(productUuid => this.productQueries.getProduct(productUuid));
	};

	private readonly getAllProductsUuidsFromContainer = (container: Container): string[] => {
		const ownerProductsUuids: string[] = container.ownerProducts;
		const sharedProductsUuids: string[] = [...container.sharedProducts, ...container.usersUuids
			.map(userUuid => this.productQueries.findContainer(userUuid))
			.map(otherUserContainer => otherUserContainer.sharedProducts)
			.flat()];
		return [...ownerProductsUuids, ...sharedProductsUuids];
	};

	private readonly validateContainersToBeShared = (container: Container, secondContainer: Container, res: Foxx.Response): void => {
		if (_.isNil(container) || _.isNil(secondContainer)) {
			res.throw(StatusCodes.NOT_FOUND, 'One of containers not found!');
		}

		if (container.usersUuids.includes(secondContainer.ownerUuid)
			|| secondContainer.usersUuids.includes(container.ownerUuid)
			|| _.eq(container.uuid, secondContainer.uuid)) {
			res.throw(StatusCodes.CONFLICT, 'Containers are already shared or there are the same!');
		}
	};

	private readonly isProductShared = (fullInternalProduct: InternalProduct, productUuid: string): boolean => {
		return productUuid === fullInternalProduct.uuid ? _.get(fullInternalProduct, 'metadata.shared', false)
			: fullInternalProduct.associatedProducts.some(associatedProduct => associatedProduct.uuid === productUuid
			&& _.get(associatedProduct, 'metadata.shared', false));
	};

	private addAssociatedProduct = (dbProduct: InternalProduct, newProduct: InternalProduct, container: Container, res: Foxx.Response): InternalProduct => {
		this.validateProductToUpdate(newProduct, dbProduct, res);

		const newAssociatedProduct: AssociatedProduct = this.productMapper.toAssociatedProduct(newProduct);

		const updatedProduct: InternalProduct = {
			...dbProduct,
			productCard: {...dbProduct.productCard, ...newProduct.productCard},
			associatedProducts: [...dbProduct.associatedProducts, newAssociatedProduct]
		};

		this.productQueries.updateProduct(updatedProduct);

		this.isProductShared(newProduct, newProduct.uuid) ? container.sharedProducts.push(newAssociatedProduct.uuid)
			: container.ownerProducts.push(newAssociatedProduct.uuid);

		this.productQueries.updateContainer(container);

		return updatedProduct;
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
		const targetKeys: string[] = Object.keys(target);

		Object.keys(target).forEach(targetKey => {
			const targetField: any = target[targetKey];
			const sourceField: any = source[targetKey];
			target[targetKey] = typeof targetField === 'object' ?
				this.mergeOnlyEmptyFields(targetField, sourceField) : this.mergeFieldIfEmpty(targetField, sourceField);
		});

		Object.keys(source).forEach(sourceKey => {
			if (!targetKeys.includes(sourceKey)) {
				target[sourceKey] = source[sourceKey];
			}
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
		} else {
			updatedProduct.associatedProducts = _.remove(updatedProduct.associatedProducts,
				(associatedProduct) => associatedProduct.uuid !== productUuidToDelete);
		}

		this.isProductShared(fullInternalProduct, productUuidToDelete) ?
			updateContainer.sharedProducts = updateContainer.sharedProducts.filter(productUuid => productUuid !== productUuidToDelete)
			: updateContainer.ownerProducts = updateContainer.ownerProducts.filter(productUuid => productUuid !== productUuidToDelete);

		this.productQueries.updateProduct(updatedProduct);
		this.productQueries.updateContainer(updateContainer);
	};

	private readonly hasProductInContainer = (container: Container, productUuid: string): boolean => {
		const allProductsUuids: string[] = [...container.ownerProducts, ...container.sharedProducts];
		return _.includes(allProductsUuids, productUuid);
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
	getContainer: (req: Foxx.Request, res: Foxx.Response) => void;
	getContainerSharedInfo: (req: Foxx.Request, res: Foxx.Response) => void;
	shareContainer: (req: Foxx.Request, res: Foxx.Response) => void;
}