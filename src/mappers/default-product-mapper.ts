import { injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';

import { AssociatedProduct } from '../models/internal/associated-product';
import { Product } from '../models/web/product';
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

	public readonly toWebProduct = (internalProduct: InternalProduct): Product => { // TODO poprawic xd
		const uuid: string = _.get(_.last(internalProduct.associatedProducts), 'uuid', internalProduct.uuid);
		return {
			uuid,
			name: internalProduct.name,
			brand: internalProduct.brand,
			photoUrl: internalProduct.photoUrl,
			barcode: internalProduct.barcode,
			category: internalProduct.category,
			price: internalProduct.price,
			totalQuantity: internalProduct.totalQuantity,
			quantity: internalProduct.quantity,
			measurementUnit: internalProduct.measurementUnit,
			nutriments: internalProduct.nutriments,
			metadata: internalProduct.metadata
		};
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

}

export interface ProductMapper {
	toAssociatedProduct: (product: Product) => AssociatedProduct;
	toWebProduct: (internalProduct: InternalProduct) => Product;
	toInternalProduct: (webProduct: Product) => InternalProduct;
}