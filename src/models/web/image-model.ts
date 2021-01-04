import * as joi from 'joi';
import * as _ from 'lodash';

export class ImageModel implements Foxx.Model {

	schema = joi.object().keys({
		uuid: joi.string(),
		name: joi.string().required(),
		bytes: joi.any().required(),
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface Image {
	uuid?: string;
	name: string;
	bytes: ArrayBuffer;
}
