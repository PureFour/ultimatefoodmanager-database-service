import * as joi from 'joi';
import * as _ from 'lodash';

export class FindUserQueryModel implements Foxx.Model {

	schema = joi.object().keys({
		email: joi.string(),
		login: joi.string()
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface FindUserQuery {
	email: string;
	login: string;
}
