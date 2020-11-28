import * as joi from 'joi';
import * as _ from 'lodash';

export class AuthenticationResponseModel implements Foxx.Model {

	schema = joi.object().keys({
		token: joi.string()
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface AuthenticationResponse {
	token: string;
}
