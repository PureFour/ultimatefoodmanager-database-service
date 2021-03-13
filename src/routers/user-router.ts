import { createRouter } from '@arangodb/foxx';
import * as joi from 'joi';
import { container } from '../config-ioc/container';
import { UserService } from '../services/default-user-service';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { UserModel } from '../models/web/user/user';
import { RegisterRequestModel } from '../models/web/user/register-request';
import { FindUserQueryModel } from '../models/web/user/find-user-query';

const MIME_TYPE = 'application/json';
const TAG: string = 'Users';

export const router: Foxx.Router = (() => {

	const foxxRouter = createRouter();

	const userService : UserService = container.get<UserService>(IDENTIFIER.USER_SERVICE);
	const uuidSchema = joi.string().required().description('User uuid');

	foxxRouter.get(':uuid', userService.getUser, 'getUser')
		.tag(TAG)
		.pathParam('uuid', uuidSchema)
		.response(StatusCodes.OK, new UserModel(), [MIME_TYPE], 'User model')
		.response(StatusCodes.NOT_FOUND,  [MIME_TYPE])
		.summary('Returns user by uuid.')
		.description(`Returns user by uuid.`);

	foxxRouter.post(userService.findUser, 'findUser')
		.tag(TAG)
		.body(new FindUserQueryModel())
		.response(StatusCodes.OK, new UserModel(), [MIME_TYPE], 'User model')
		.response(StatusCodes.NOT_FOUND,  [MIME_TYPE])
		.summary('Returns user by uuid.')
		.description(`Returns user by uuid.`);

	foxxRouter.post('signUp', userService.addUser, 'addUser')
		.tag(TAG)
		.body(new RegisterRequestModel(), [MIME_TYPE])
		.response(StatusCodes.CREATED, new UserModel(), [MIME_TYPE], 'Register response model')
		.response(StatusCodes.BAD_REQUEST, [MIME_TYPE])
		.summary('Returns created user with uuid auth token.')
		.description(`Returns created user with uuid auth token.`);

	foxxRouter.delete(':uuid', userService.deleteUser, 'deleteUser')
		.tag(TAG)
		.pathParam('uuid', uuidSchema)
		.response(StatusCodes.OK, [MIME_TYPE])
		.response(StatusCodes.NOT_FOUND, [MIME_TYPE]);

	return foxxRouter;
})();
