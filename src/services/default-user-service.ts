import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { UserQueries } from '../queries/default-user-queries';
import { StatusCodes } from 'http-status-codes';
import { User } from '../models/web/user';

@injectable()
export class DefaultUserService implements UserService {
	constructor(
		@inject(IDENTIFIER.USER_QUERIES) private readonly userQueries: UserQueries
	) {
	}

	public getUser = (req: Foxx.Request, res: Foxx.Response): void => {
		const user : User = this.userQueries.getUser(req.pathParams.uuid);
		if (!_.isNil(user)) {
			this.finalize(res, user, StatusCodes.OK);
		} else {
			res.throw(StatusCodes.NOT_FOUND, 'User not found.');
		}
	};


	private finalize = (res, payload, status) => {
		res.status(status);
		res.send(payload);
	};
}

export interface UserService {
	getUser: (req: Foxx.Request, res: Foxx.Response) => void;
}