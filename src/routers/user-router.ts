import { createRouter } from '@arangodb/foxx';
import * as joi from 'joi';
import { container } from '../config-ioc/container';
import { UserService } from '../services/default-user-service';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { UserModel } from '../models/web/user';

const MIME_TYPE = 'application/json';

export const router: Foxx.Router = (() => {

	const foxxRouter = createRouter();

	const userService : UserService = container.get<UserService>(IDENTIFIER.USER_SERVICE);
	const uuidSchema = joi.string().required().description('User uuid');

	foxxRouter.get(':uuid', userService.getUser, 'getUser')
		.pathParam('uuid', uuidSchema)
		.response(StatusCodes.OK, new UserModel(), [MIME_TYPE], 'User model')
		.response(StatusCodes.NOT_FOUND,  [MIME_TYPE])
		.summary('Returns user by uuid.')
		.description(`Returns user by uuid.`);

	return foxxRouter;
})();
