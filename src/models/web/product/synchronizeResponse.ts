import * as joi from 'joi';
import * as _ from 'lodash';
import { Product, ProductModel } from './product';

export class SynchronizeResponseModel implements Foxx.Model {

	schema = joi.object().keys({
		synchronizedProducts: joi.array().items(new ProductModel().schema),
		status: joi.string()
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface SynchronizeResponse {
	synchronizedProducts: Product[];
	status: string;
}
