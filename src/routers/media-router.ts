import { createRouter } from '@arangodb/foxx';
import * as joi from 'joi';
import { container } from '../config-ioc/container';
import IDENTIFIER from '../config-ioc/identifiers';
import { StatusCodes } from 'http-status-codes';
import { MediaService } from '../services/default-media-service';
import { ImageModel } from '../models/web/image-model';

const MIME_TYPE = 'application/json';
const TAG: string = 'Media';

export const router: Foxx.Router = (() => {

	const foxxRouter = createRouter();

	const mediaService : MediaService = container.get<MediaService>(IDENTIFIER.MEDIA_SERVICE);
	const uuidSchema = joi.string().required().description('Media uuid');

	foxxRouter.post('images', mediaService.saveImage, 'saveImage')
		.tag(TAG)
		.body(new ImageModel())
		.response(StatusCodes.CREATED, new ImageModel(), [MIME_TYPE], 'Image model')
		.summary('Save image.')
		.description(`Save image.`);

	foxxRouter.get('images/:uuid', mediaService.getImage, 'getImage')
		.tag(TAG)
		.pathParam('uuid', uuidSchema)
		.response(StatusCodes.OK, new ImageModel(), [MIME_TYPE], 'Image model')
		.response(StatusCodes.NOT_FOUND,  [MIME_TYPE])
		.summary('Returns image by uuid.')
		.description(`Returns image by uuid.`);

	foxxRouter.delete('images/:uuid', mediaService.deleteImage, 'deleteImage')
		.tag(TAG)
		.pathParam('uuid', uuidSchema)
		.summary('Deletes image by uuid.')
		.description(`Deletes image by uuid.`);

	return foxxRouter;
})();
