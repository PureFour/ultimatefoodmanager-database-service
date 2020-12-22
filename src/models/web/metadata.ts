import * as joi from 'joi';
import * as _ from 'lodash';

export class MetadataModel implements Foxx.Model {

	schema = joi.object().keys({
		synchronized: joi.boolean(),
		toBeDeleted: joi.boolean(),
		createdDate: joi.string(),
		expiryDate: joi.string().allow(null)
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface Metadata {
	synchronized: boolean;
	toBeDeleted: boolean;
	createdDate: string;
	expiryDate: string;
}
