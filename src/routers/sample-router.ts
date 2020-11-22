import {createRouter} from '@arangodb/foxx';
import * as HttpStatus from 'http-status-codes';

const MIME_TYPE = 'application/json';

export const router: Foxx.Router = (() => {

	const foxxRouter = createRouter();

	foxxRouter.get('helloWorld', (_req: Foxx.Request, res: Foxx.Response) => res.send('Hello World!'), 'simpleEndpoint')
		.response(HttpStatus.OK, [MIME_TYPE], 'Hello World message')
		.summary('Returns "HelloWorld" message.')
		.description(`Returns "HelloWorld" message.`);

	return foxxRouter;
})();
