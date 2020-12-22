import { injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';

import { AssociatedProduct } from '../models/internal/associated-product';
import { Product, ProductModel } from '../models/web/product';
import { UTILS_SERVICE } from '../services/util-service';
import { InternalProduct } from '../models/internal/internal-product';

@injectable()
export class DefaultProductMapper implements ProductMapper {

	public readonly toAssociatedProduct = (product: Product): AssociatedProduct => {
		return {
			uuid: UTILS_SERVICE.generateUuid(),
			quantity: product.totalQuantity,
			metadata: {
				createdDate: UTILS_SERVICE.generateDate(),
				expiryDate: _.get(product, 'metadata.expiryDate', null),
				synchronized: true,
				toBeDeleted: false
			}
		};
	};

	public readonly toWebProduct = (internalProduct: InternalProduct): Product => {
		return <Product> new ProductModel().forClient(_.omit(internalProduct, 'associatedProducts'));
	};


	public readonly toInternalProduct = (webProduct: Product): InternalProduct => {
		return {
			uuid: UTILS_SERVICE.generateUuid(),
			...webProduct,
			metadata: {
				createdDate: _.get(webProduct, 'metadata.createdDate', null) ? webProduct.metadata.createdDate : UTILS_SERVICE.generateDate(),
				expiryDate: _.get(webProduct, 'metadata.expiryDate', null),
				synchronized: true,
				toBeDeleted: false
			},
			associatedProducts: []
		};
	};

	public readonly toUpdatedFullProduct = (oldFullProduct: InternalProduct, newProduct: Product): InternalProduct => {
		if (oldFullProduct.uuid === newProduct.uuid) {
			return { ...oldFullProduct, ...newProduct };
		} else {
			const newAssociatedProduct: AssociatedProduct = {uuid: newProduct.uuid, quantity: _.get(newProduct, 'quantity'),  metadata: _.get(newProduct, 'metadata')};
			const newProductCard = _.omit(newProduct, ['uuid', 'metadata', 'associatedProducts', 'quantity']); // TODO wywalić po zmianie rozłożeniu modelu
			const updatedProduct: InternalProduct = { ...oldFullProduct, ...newProductCard };
			updatedProduct.associatedProducts = updatedProduct.associatedProducts
				.map(oldAP => oldAP.uuid === newAssociatedProduct.uuid ? ({uuid: oldAP.uuid, ...newAssociatedProduct}) : oldAP);
			return updatedProduct;
		}
	};
}

export interface ProductMapper {
	toAssociatedProduct: (product: Product) => AssociatedProduct;
	toWebProduct: (internalProduct: InternalProduct) => Product;
	toInternalProduct: (webProduct: Product) => InternalProduct;
	toUpdatedFullProduct: (oldFullProduct: InternalProduct, newProduct: Product) => InternalProduct;
}