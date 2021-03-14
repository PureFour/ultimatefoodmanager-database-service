import * as joi from 'joi';
import * as _ from 'lodash';
import { positiveNumber } from '../utils';
import { User, UserModel } from './user';

export class SharedInfoModel implements Foxx.Model {

	schema = joi.object().keys({
		sharingUsers: joi.array().items(new UserModel().schema),
		totalSharedProducts: positiveNumber,
		totalOwnedProducts: positiveNumber,
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface SharedInfo {
	sharingUsers: User[];
	totalSharedProducts: number;
	totalOwnedProducts: number;
}
