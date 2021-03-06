import * as joi from 'joi';
import * as _ from 'lodash';

export class RegisterRequestModel implements Foxx.Model {

	schema = joi.object().keys({
		email: joi.string(),
		login: joi.string(),
		password: joi.string(),
		notificationToken: joi.string()
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface RegisterRequest {
	email: string;
	login: string;
	password: string;
	notificationToken: string;
}
