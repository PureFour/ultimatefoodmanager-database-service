import * as joi from 'joi';
import * as _ from 'lodash';

export class ContainerModel implements Foxx.Model {

	schema = joi.object().keys({
		uuid: joi.string(),
		ownerUuid: joi.string(),
		ownerProducts: joi.array().items(joi.string()),
		usersUuids: joi.array().items(joi.string()),
		sharedProducts: joi.array().items(joi.string())
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface Container {
	uuid: string;
	ownerUuid: string;
	ownerProducts: string[];
	usersUuids: string[];
	sharedProducts: string[];
}
