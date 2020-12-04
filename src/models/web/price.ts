import * as joi from 'joi';
import * as _ from 'lodash';

export class PriceModel implements Foxx.Model {

	schema = joi.object().keys({
		value: joi.number(),
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
