import * as joi from 'joi';
import * as _ from 'lodash';
import { positiveNumber } from '../utils';

export class PriceModel implements Foxx.Model {

	schema = joi.object().keys({
		value: positiveNumber,
		currency: joi.string(),
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface Price {
	value: number;
	currency: string;
}
