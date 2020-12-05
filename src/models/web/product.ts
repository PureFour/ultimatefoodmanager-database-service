import * as joi from 'joi';
import * as _ from 'lodash';
import {Nutriments, NutrimentsModel} from './nutriments';
import { Price, PriceModel } from './price';
import { Metadata, MetadataModel } from './metadata';

export class ProductModel implements Foxx.Model {

	schema = joi.object().keys({
		uuid: joi.string(),
		name: joi.string(),
		brand: joi.string(),
		photoUrl: joi.string(),
		barcode: joi.string(),
		category: joi.string(),
		price: new PriceModel().schema,
		totalQuantity: joi.number(),
		quantity: joi.number(),
		measurementUnit: joi.string(),
		nutriments: new NutrimentsModel().schema,
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
	name: string;
	brand: string;
	photoUrl: string;
	barcode: string;
	category: string;
	price: Price;
	totalQuantity: number;
	quantity: number;
	measurementUnit: string;
	nutriments: Nutriments;
	metadata: Metadata;
}
