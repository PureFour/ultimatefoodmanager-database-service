import { injectable } from 'inversify';
import 'reflect-metadata';

import { User } from '../models/web/user/user';
import { RegisterRequest } from '../models/web/user/register-request';
import { UTILS_SERVICE } from '../services/util-service';

@injectable()
export class DefaultUserMapper implements UserMapper {

	public readonly toUserModel = (registerRequest: RegisterRequest): User => {
		return {
			uuid: UTILS_SERVICE.generateUuid(),
			email: registerRequest.email,
			login: registerRequest.login,
			password: registerRequest.password,
			notificationToken: registerRequest.notificationToken
		};
	};
}

export interface UserMapper {
	toUserModel: (registerRequest: RegisterRequest) => User;
}