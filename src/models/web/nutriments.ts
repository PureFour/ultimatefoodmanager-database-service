import * as joi from 'joi';
import * as _ from 'lodash';
import { positiveNumber } from './utils';

export class NutrimentsModel implements Foxx.Model {

	schema = joi.object().keys({
		energy: positiveNumber,
		fat: positiveNumber,
		saturatedFat: positiveNumber,
		insatiableFat: positiveNumber,
		carbohydrates: positiveNumber,
		sugars: positiveNumber,
		fiber: positiveNumber,
		salt: positiveNumber,
		sodium: positiveNumber,
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
