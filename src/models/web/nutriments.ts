import * as joi from 'joi';
import * as _ from 'lodash';

export class NutrimentsModel implements Foxx.Model {

	schema = joi.object().keys({
		energy: joi.number(),
		fat: joi.number(),
		saturatedFat: joi.number(),
		insatiableFat: joi.number(),
		carbohydrates: joi.number(),
		sugars: joi.number(),
		fiber: joi.number(),
		salt: joi.number(),
		sodium: joi.number(),
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface Nutriments {
	energy: number;
	fat: number;
	saturatedFat: number;
	insatiableFat: number;
	carbohydrates: number;
	sugars: number;
	fiber: number;
	salt: number;
	sodium: number;
}
