import { injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';

import { AssociatedProduct } from '../models/internal/associated-product';
import { Product, ProductModel } from '../models/web/product';
import { UTILS_SERVICE } from '../services/util-service';
import { InternalProduct } from '../models/internal/internal-product';

@injectable()
export class DefaultProductMapper implements ProductMapper {

	public readonly toAssociatedProduct = (product: InternalProduct): AssociatedProduct => {
		return {
			uuid: UTILS_SERVICE.generateUuid(),
			quantity: product.quantity,
			metadata: {
				createdDate: UTILS_SERVICE.generateDate(),
				expiryDate: _.get(product, 'metadata.expiryDate', null),
				synchronized: true,
				toBeDeleted: false,
				shared: _.get(product, 'metadata.shared', false)
			}
		};
	};

	public readonly toWebProduct = (internalProduct: InternalProduct): Product => {
		return <Product> new ProductModel().forClient(_.omit(internalProduct, 'associatedProducts'));
	};


	public readonly toInternalProduct = (webProduct: Product): InternalProduct => {
		return {
			uuid: UTILS_SERVICE.generateUuid(),
			productCard: webProduct.productCard,
			quantity: webProduct.quantity ? webProduct.quantity : webProduct.productCard.totalQuantity,
			metadata: {
				createdDate: _.get(webProduct, 'metadata.createdDate', null) ? webProduct.metadata.createdDate : UTILS_SERVICE.generateDate(),
				expiryDate: _.get(webProduct, 'metadata.expiryDate', null),
				synchronized: true,
				toBeDeleted: false,
				shared: _.get(webProduct, 'metadata.shared', false)

			},
			associatedProducts: []
		};
	};

	public readonly toUpdatedFullProduct = (oldFullProduct: InternalProduct, newProduct: Product): InternalProduct => {
		if (oldFullProduct.uuid === newProduct.uuid) {
			return { ...oldFullProduct, ...newProduct };
		} else {
			const newAssociatedProduct: AssociatedProduct = {uuid: newProduct.uuid, quantity: _.get(newProduct, 'quantity'),  metadata: _.get(newProduct, 'metadata')};
			const updatedProduct: InternalProduct = {
				...oldFullProduct,
				productCard: {...oldFullProduct.productCard, ...newProduct.productCard}
			};
			updatedProduct.associatedProducts = updatedProduct.associatedProducts
				.map(oldAP => oldAP.uuid === newAssociatedProduct.uuid ? ({uuid: oldAP.uuid, ...newAssociatedProduct}) : oldAP);
			return updatedProduct;
		}
	};
}

export interface ProductMapper {
	toAssociatedProduct: (product: InternalProduct) => AssociatedProduct;
	toWebProduct: (internalProduct: InternalProduct) => Product;
	toInternalProduct: (webProduct: Product) => InternalProduct;
	toUpdatedFullProduct: (oldFullProduct: InternalProduct, newProduct: Product) => InternalProduct;
}