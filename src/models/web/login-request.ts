import * as joi from 'joi';
import * as _ from 'lodash';

export class LoginRequestModel implements Foxx.Model {

	schema = joi.object().keys({
		email: joi.string(),
		password: joi.string()
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface LoginRequest {
	email: string;
	password: string;
}
