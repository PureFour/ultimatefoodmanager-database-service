import * as joi from 'joi';
import * as _ from 'lodash';

export class UserModel implements Foxx.Model {

	schema = joi.object().keys({
		uuid: joi.string(),
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

export interface User {
	uuid: string;
	email: string;
	login: string;
	password: string;
	notificationToken: string;
}
