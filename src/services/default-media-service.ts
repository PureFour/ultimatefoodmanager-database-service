import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import * as _ from 'lodash';
import IDENTIFIER from '../config-ioc/identifiers';
import { MediaQueries } from '../queries/default-media-queries';
import { Image } from '../models/web/media/image-model';
import { UTILS_SERVICE } from './util-service';
import { StatusCodes } from 'http-status-codes';

const finalize = UTILS_SERVICE.finalize;

@injectable()
export class DefaultMediaService implements MediaService {
	constructor(
		@inject(IDENTIFIER.MEDIA_QUERIES) private readonly mediaQueries: MediaQueries
	) {
	}

	public saveImage = (req: Foxx.Request, res: Foxx.Response): void => {
		const image: Image = req.body;

		this.mediaQueries.saveImage(image);

		finalize(res, image, StatusCodes.CREATED);
	};

	public getImage = (req: Foxx.Request, res: Foxx.Response): void => {
		const image : Image = this.mediaQueries.getImage(req.pathParams.uuid);

		if (!_.isNil(image)) {
			finalize(res, image, StatusCodes.OK);
		} else {
			res.throw(StatusCodes.NOT_FOUND, 'Image not found.');
		}

	};

	public deleteImage = (req: Foxx.Request, res: Foxx.Response): void => {
		const deletedImage: Image = this.mediaQueries.deleteImage(req.pathParams.uuid);

		if (_.isNil(deletedImage)) {
			res.throw(StatusCodes.NOT_FOUND, 'Image not found.');
		}
	};
}

export interface MediaService {
	saveImage: (req: Foxx.Request, res: Foxx.Response) => void;
	getImage: (req: Foxx.Request, res: Foxx.Response) => void;
	deleteImage: (req: Foxx.Request, res: Foxx.Response) => void;
}