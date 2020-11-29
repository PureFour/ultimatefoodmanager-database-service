import * as joi from 'joi';
import * as _ from 'lodash';
import {Nutriments, NutrimentsModel} from './nutriments';

export class ProductModel implements Foxx.Model {

	schema = joi.object().keys({
		uuid: joi.string(),
		name: joi.string(),
		brand: joi.string(),
		barcode: joi.string(),
		category: joi.string(),
		price: joi.number(),
		currency: joi.string(),
		measurementUnit: joi.string(),
		quantity: joi.number(),
		nutriments: new NutrimentsModel().schema,
		expiryDate: joi.date()
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
	name: string;
	brand: string;
	barcode: string;
	category: string;
	price: number;
	currency: string;
	measurementUnit: string;
	quantity: number;
	nutriments: Nutriments;
	expiryDate: string;
}
