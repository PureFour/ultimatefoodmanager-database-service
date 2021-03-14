import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { ProductQueries } from '../queries/default-product-queries';
import { ProductMapper } from '../mappers/default-product-mapper';
import { InternalProduct } from '../models/internal/internal-product';
import { Container } from '../models/internal/container';
import { Product } from '../models/web/product/product';
import { AssociatedProduct } from '../models/internal/associated-product';
import { ProductCard } from '../models/web/product/product-card';
import { User } from '../models/web/user/user';
import { UserQueries } from '../queries/default-user-queries';
import { SharedInfo } from '../models/web/user/shared-info';
import { OutdatedProductWithUserData } from '../models/web/product/outdatedProductWithUserData';
import { QueryFilter } from '../models/web/filters/query-filter';
import { Sorting } from '../models/web/filters/sorting';
import { Selector } from '../models/web/filters/selector';
import { Filter } from '../models/web/filters/filter';
import { Range } from '../models/web/filters/range';
import { UTILS_SERVICE } from './util-service';

@injectable()
export class DefaultProductService implements ProductService {
	constructor(
		@inject(IDENTIFIER.PRODUCT_QUERIES) private readonly productQueries: ProductQueries,
		@inject(IDENTIFIER.USER_QUERIES) private readonly userQueries: UserQueries,
		@inject(IDENTIFIER.PRODUCT_MAPPER) private readonly productMapper: ProductMapper,
	) {
	}

	public addProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const createdProduct: InternalProduct = this._addProduct(req.body, req.pathParams.userUuid, res);
		this.finalize(res, this.productMapper.toWebProduct(createdProduct), StatusCodes.CREATED);
	};

	private _addProduct = (product: Product, userUuid: string, res: Foxx.Response): InternalProduct => {
		const productToAdd: InternalProduct = this.productMapper.toInternalProduct(product);
		this.handleGlobalProductCard(productToAdd.productCard);

		const container: Container = this.productQueries.findContainer(userUuid);

		const dbProduct: InternalProduct = this.findProductByBarcode(
			[...container.ownerProducts, ...container.sharedProducts],
			productToAdd.productCard.barcode);
		return _.isNil(dbProduct) ?
			this.productQueries.addProduct(productToAdd, container.uuid)
			: this.addAssociatedProduct(dbProduct, productToAdd, container, res);
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
		const updatedProduct: InternalProduct = this._updateProduct(req.body, res);
		this.finalize(res, this.productMapper.toWebProduct(updatedProduct), StatusCodes.OK);
	};

	private _updateProduct = (productToUpdate: Product, res: Foxx.Response): InternalProduct => {
		if (_.isNil(productToUpdate.uuid)) {
			res.throw(StatusCodes.BAD_REQUEST, 'Product uuid must be filled!');
		}
		const oldProduct: InternalProduct = this.productQueries.getProduct(productToUpdate.uuid);

		this.validateProductToUpdate(productToUpdate, oldProduct, res);
		this.handleGlobalProductCard(productToUpdate.productCard);

		const updatedProduct: InternalProduct = this.productMapper.toUpdatedFullProduct(this.productQueries.getFullProduct(productToUpdate.uuid), productToUpdate);
		this.markAsSynchronized(updatedProduct);
		this.productQueries.updateProduct(updatedProduct);

		if (!_.get(oldProduct, 'metadata.shared')
			&& _.get(productToUpdate, 'metadata.shared')) {
			this.shareProductToAllUsers(productToUpdate.uuid);
		}
		return updatedProduct;
	};

	public synchronizeAll = (req: Foxx.Request, res: Foxx.Response): void => {
		const userUuid: string = req.pathParams.userUuid;
		const container: Container = this.productQueries.findContainer(userUuid);
		const productsToSync: Product[] = req.body;

		this.upsertProducts(productsToSync, userUuid, res);
		const userProducts: InternalProduct[] = _.isNil(container) ? [] : this.getAllProductsFromContainer(container);

		this.finalize(res, userProducts.map(product => this.productMapper.toWebProduct(product)), StatusCodes.OK);
	};

	private upsertProducts = (products: Product[], userUuid: string, res: Foxx.Response): void => {
		products.forEach(product => {
			if (_.isNil(this.productQueries.getProduct(product.uuid))) {
				this._addProduct(product, userUuid, res);
			} else {
				_.get(product, 'metadata.toBeDeleted') ? this._deleteProduct(product, userUuid, res)
					: this._updateProduct(product, res);
			}
		});
	};

	public readonly getProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		const internalProduct: InternalProduct = this.productQueries.getProduct(uuid);


		if (_.isNil(internalProduct)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found!');
		}

		this.finalize(res, this.productMapper.toWebProduct(internalProduct), StatusCodes.OK);
	};

	public readonly getOutdatedProducts = (_req: Foxx.Request, res: Foxx.Response): void => {
		const outdatedProducts: InternalProduct[] = this.productQueries.getAllOutdatedProducts();
		const outdatedProductsWithUsers: OutdatedProductWithUserData[] = [];
		outdatedProducts.forEach(outdatedProduct => {
			outdatedProductsWithUsers.push({
				outdatedProduct: this.productMapper.toWebProduct(outdatedProduct),
				users: this.getProductOwners(outdatedProduct.uuid)
			});
		});
		this.finalize(res, outdatedProductsWithUsers, StatusCodes.OK);
	};

	public readonly getAllProducts = (req: Foxx.Request, res: Foxx.Response): void => {
		const userUuid: string = req.pathParams.userUuid;
		const container: Container = this.productQueries.findContainer(userUuid);
		if (_.isNil(container)) {
			res.send([]);
			return;
		}
		const queryFilter: QueryFilter = req.body;
		const products: InternalProduct[] = this.getAllProductsFromContainer(container);
		const filteredProducts: InternalProduct[] = this.filterAndSortProducts(products, queryFilter, res);
		this.finalize(res, filteredProducts.map(product => this.productMapper.toWebProduct(product)), StatusCodes.OK);
	};

	public readonly deleteProduct = (req: Foxx.Request, res: Foxx.Response): void => {
		this._deleteProduct(req.body, req.pathParams.userUuid, res);
	};

	private _deleteProduct = (product: Product, userUuid: string, res: Foxx.Response): void => {
		const productUuidToDelete: string = product.uuid;
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

	public readonly findProductCard = (req: Foxx.Request, res: Foxx.Response): void => {
		const productCard: ProductCard = this.productQueries.findGlobalProductCard(req.pathParams.barcode);

		if (_.isNil(productCard)) {
			res.throw(StatusCodes.NOT_FOUND, 'Product not found!');
		}

		this.finalize(res, productCard, StatusCodes.OK);
	};

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

		container.usersUuids.push(targetContainer.ownerUuid, ...targetContainer.usersUuids);
		targetContainer.usersUuids.push(container.ownerUuid);
		this.propagateToAllSharingUsers(targetContainer.usersUuids, container.ownerUuid);

		this.productQueries.updateContainer(container);
		this.productQueries.updateContainer(targetContainer);
	};

	private readonly filterAndSortProducts = (products: InternalProduct[], queryFilter: QueryFilter, res: Foxx.Response): InternalProduct[] => {
		try {
			const sorting: Sorting = queryFilter.sorting;
			const filteredProducts: InternalProduct[] = _.isNil(queryFilter.filters) ? products : this.filterProducts(products, queryFilter);
			return _.isNil(sorting) ? filteredProducts : this.sortProducts(filteredProducts, sorting);
		} catch (e) {
			res.throw(StatusCodes.BAD_REQUEST, e.message);
		}
		return products;
	};

	private readonly filterProducts = (products: InternalProduct[], queryFilter: QueryFilter): InternalProduct[] => {
		queryFilter.filters.forEach(filter => {
			products = this.internalFilterProducts(products, filter);
		}, products);
		return products;
	};

	private readonly internalFilterProducts = (products: InternalProduct[], filter: Filter): InternalProduct[] => {
		return products.filter(product => this.getFilterFunction(filter)(product));
	};

	private readonly getFilterFunction = (filter: Filter) => {
		if (!Object.values(Selector).includes(filter.selector)) {
			throw new Error('Incorrect filter selector! available selectors : [CATEGORY, CURRENCY, PRICE, EXPIRY_DATE, CREATED_DATE]');
		}

		if ((filter.range.minimumValue || filter.range.maximumValue) && filter.range.exactValue) {
			throw new Error('Incorrect filter range values! Cannot be set all filter range values!');
		}

		switch (filter.selector) {
			case Selector.PRICE:
				return (product: InternalProduct): boolean =>
					_.inRange(product.productCard.price.value, filter.range.minimumValue, filter.range.maximumValue);
			case Selector.CURRENCY:
				return (product: InternalProduct): boolean =>
					_.eq(product.productCard.price.currency, filter.range.exactValue);
			case Selector.CATEGORY:
				return (product: InternalProduct): boolean =>
					_.eq(product.productCard.category, filter.range.exactValue);
			case Selector.CREATED_DATE:
				return (product: InternalProduct): boolean =>
					this.compareProductDates(product.metadata.createdDate, filter.range);
			case Selector.EXPIRY_DATE:
				return (product: InternalProduct): boolean =>
					this.compareProductDates(product.metadata.expiryDate, filter.range);
		}
	};

	private readonly compareProductDates = (productDateString: string, filterRange: Range): boolean => {
		const exactDateString: string = filterRange.exactValue;
		const minimumDateString: string = filterRange.minimumValue;
		const maximumDateString: string = filterRange.maximumValue;

		if (!UTILS_SERVICE.isBeforeDate(minimumDateString, maximumDateString)) {
			throw new Error('Incorrect filter date range values! startDate must be before endDate!');
		}

		return _.isNil(exactDateString) ?
			UTILS_SERVICE.isBetweenDates(productDateString, minimumDateString, maximumDateString)
			: UTILS_SERVICE.areEqualDates(productDateString, exactDateString);
	};

	private readonly sortProducts = (products: InternalProduct[], sorting: Sorting): InternalProduct[] => {
		const sortedAscending: InternalProduct[] = _.sortBy(products, [this.getSortingFunction(sorting)]);
		return sorting.ascending ? sortedAscending : _.reverse(sortedAscending);
	};

	private readonly getSortingFunction = (sorting: Sorting) => {
		if (![Selector.PRICE, Selector.EXPIRY_DATE, Selector.CREATED_DATE].includes(sorting.selector)) {
			throw new Error('Incorrect sorting selector! available selectors : [PRICE, EXPIRY_DATE, CREATED_DATE]');
		}

		switch (sorting.selector) {
			case Selector.PRICE:
				return (product: InternalProduct) => product.productCard.price.value;
			case Selector.CREATED_DATE:
				return (product: InternalProduct) => product.metadata.createdDate;
			case Selector.EXPIRY_DATE:
				return (product: InternalProduct) => product.metadata.expiryDate;
		}
	};

	private markAsSynchronized = (product: InternalProduct): void => {
		_.set(product, 'metadata.synchronized', true);
		product.associatedProducts.forEach(associatedProduct =>
			_.set(associatedProduct, 'metadata.synchronized', true));
	}

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

	private shareProductToAllUsers = (productUuid: string): void => {
		const productOwnerContainer: Container = this.productQueries.getContainersWithProduct(productUuid);
		_.remove(productOwnerContainer.ownerProducts, (uuid) => uuid === productUuid);
		productOwnerContainer.sharedProducts.push(productUuid);
		this.productQueries.updateContainer(productOwnerContainer);
	};

	private propagateToAllSharingUsers = (usersUuids: string[], targetContainerOwnerUuid: string): void => {
		usersUuids
			.map(userUuid => this.productQueries.findContainer(userUuid))
			.forEach(container => {
				container.usersUuids.push(targetContainerOwnerUuid);
				this.productQueries.updateContainer(container);
			});
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

		if (!_.isEmpty(container.usersUuids)
			|| container.usersUuids.includes(secondContainer.ownerUuid)
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

	private getProductOwners = (productUuid: string): User[] => {
		const containerWithProduct: Container = this.productQueries.getContainersWithProduct(productUuid);
		return [containerWithProduct.ownerUuid, ...containerWithProduct.usersUuids]
			.map(ownerUuid => this.userQueries.getUser(ownerUuid));
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
	synchronizeAll: (req: Foxx.Request, res: Foxx.Response) => void;
	getProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	getOutdatedProducts: (req: Foxx.Request, res: Foxx.Response) => void;
	getAllProducts: (req: Foxx.Request, res: Foxx.Response) => void;
	deleteProduct: (req: Foxx.Request, res: Foxx.Response) => void;
	findProductCard: (req: Foxx.Request, res: Foxx.Response) => void;
	getContainer: (req: Foxx.Request, res: Foxx.Response) => void;
	getContainerSharedInfo: (req: Foxx.Request, res: Foxx.Response) => void;
	shareContainer: (req: Foxx.Request, res: Foxx.Response) => void;
}