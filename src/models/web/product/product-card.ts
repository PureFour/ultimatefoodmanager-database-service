import * as joi from 'joi';
import * as _ from 'lodash';
import {Nutriments, NutrimentsModel} from './nutriments';
import { Price, PriceModel } from './price';
import { positiveNumber } from '../utils';

export class ProductCardModel implements Foxx.Model {

	schema = joi.object().keys({
		barcode: joi.string().required(),
		name: joi.string().required(),
		brand: joi.string(),
		photoUrl: joi.string(),
		category: joi.string(),
		price: new PriceModel().schema,
		totalQuantity: positiveNumber,
		measurementUnit: joi.string(),
		nutriments: new NutrimentsModel().schema
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface ProductCard {
	barcode: string;
	name: string;
	brand: string;
	photoUrl: string;
	category: string;
	price: Price;
	totalQuantity: number;
	measurementUnit: string;
	nutriments: Nutriments;
}
