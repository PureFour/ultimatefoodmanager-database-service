import { injectable } from 'inversify';
import { DOCUMENT_COLLECTION } from '../models/enums/document-collections';
import { aql, db } from '@arangodb';
import { Image } from '../models/web/media/image-model';

const imagesCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.IMAGES.collection;

@injectable()
export class DefaultMediaQueries implements MediaQueries {

	public saveImage = (image: Image): Image => {
		return db._query(aql`
            INSERT ${image}
            IN ${imagesCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public getImage = (uuid: string): Image => {
		return db._query(aql`
           	FOR image IN ${imagesCollection}
           	FILTER image.uuid == ${uuid}
            RETURN image
      	`).toArray()[0];
	};

	public deleteImage = (uuid: string): Image => {
		return db._query(aql`
            FOR image IN ${imagesCollection}
            FILTER image.uuid == ${uuid}
            REMOVE image IN ${imagesCollection}
            LET removed = OLD
            RETURN removed
      	`).toArray()[0];
	};
}

export interface MediaQueries {
	saveImage: (image: Image) => Image;
	getImage: (uuid: string) => Image;
	deleteImage: (uuid: string) => Image;
}