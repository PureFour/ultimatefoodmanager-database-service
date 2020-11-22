import {Collection} from '../collection';

export const DOCUMENT_COLLECTION = Object.freeze({
	SAMPLE_COLLECTION: new Collection('sample-collection', [
		{type: 'hash', fields: []}
	])
});

export const ALL_DOCUMENT_COLLECTIONS: Collection[] = Object.values(DOCUMENT_COLLECTION);
