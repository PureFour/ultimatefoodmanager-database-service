import * as joi from 'joi';
import * as _ from 'lodash';
import { Metadata, MetadataModel } from './metadata';
import { positiveNumber } from '../utils';
import { ProductCard, ProductCardModel } from './product-card';

export class ProductModel implements Foxx.Model {

	schema = joi.object().keys({
		uuid: joi.string(),
		productCard: new ProductCardModel().schema,
		quantity: positiveNumber,
		metadata: new MetadataModel().schema
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface Product {
	uuid: string;
	productCard: ProductCard;
	quantity: number;
	metadata: Metadata;
}
