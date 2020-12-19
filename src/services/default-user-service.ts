import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { UserQueries } from '../queries/default-user-queries';
import { StatusCodes } from 'http-status-codes';
import { User } from '../models/web/user';
import { RegisterRequest } from '../models/web/register-request';
import { UserMapper } from '../mappers/default-user-mapper';
import { FindUserQuery } from '../models/web/find-user-query';

@injectable()
export class DefaultUserService implements UserService {
	constructor(
		@inject(IDENTIFIER.USER_QUERIES) private readonly userQueries: UserQueries,
		@inject(IDENTIFIER.USER_MAPPER) private readonly userMapper: UserMapper
	) {}

	public getUser = (req: Foxx.Request, res: Foxx.Response): void => {
		const user : User = this.userQueries.getUser(req.pathParams.uuid);

		if (!_.isNil(user)) {
			this.finalize(res, user, StatusCodes.OK);
		} else {
			res.throw(StatusCodes.NOT_FOUND, 'User not found.');
		}
	};

	public findUser = (req: Foxx.Request, res: Foxx.Response): void => {
		const findUserQuery: FindUserQuery = req.body;

		const user : User = this.userQueries.findUser(
			findUserQuery.email, _.isNil(findUserQuery.login) ? '' : findUserQuery.login);

		if (!_.isNil(user)) {
			this.finalize(res, user, StatusCodes.OK);
		} else {
			res.throw(StatusCodes.NOT_FOUND, 'User not found.');
		}
	};

	public addUser = (req: Foxx.Request, res: Foxx.Response): void => {
		const registerRequest: RegisterRequest = req.body;

		if (!_.isNil(this.userQueries.findUser(registerRequest.email, registerRequest.login))) {
			res.throw(StatusCodes.CONFLICT, 'User already exists');
		}

		const createdUser: User = this.userMapper.toUserModel(registerRequest);
		this.userQueries.addUser(createdUser);

		this.finalize(res, createdUser, StatusCodes.CREATED);
	};

	public deleteUser = (req: Foxx.Request, res: Foxx.Response): void => {
		const uuid: string = req.pathParams.uuid;
		if (_.isNil(this.userQueries.deleteUser(uuid))) {
			res.throw(StatusCodes.NOT_FOUND, 'User not found.');
		}

		res.send(StatusCodes.OK);
	};

	private finalize = (res, payload, status) => {
		res.status(status);
		res.send(payload);
	};
}

export interface UserService {
	getUser: (req: Foxx.Request, res: Foxx.Response) => void;
	findUser: (req: Foxx.Request, res: Foxx.Response) => void;
	addUser: (req: Foxx.Request, res: Foxx.Response) => void;
	deleteUser: (req: Foxx.Request, res: Foxx.Response) => void;
}