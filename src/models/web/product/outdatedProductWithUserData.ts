import * as joi from 'joi';
import * as _ from 'lodash';
import { Product, ProductModel } from './product';
import { User, UserModel } from '../user/user';

export class OutdatedProductWithUserDataModel implements Foxx.Model {

	schema = joi.object().keys({
		outdatedProduct: new ProductModel().schema,
		users: joi.array().items(new UserModel().schema)
	});

	forClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	};

	fromClient = (obj) => {
		return _.omit(obj, ['_id', '_key', '_rev']);
	}
}

export interface OutdatedProductWithUserData {
	outdatedProduct: Product;
	users: User[];
}
