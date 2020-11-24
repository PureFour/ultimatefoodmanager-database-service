import {Collection} from '../collection';

export const DOCUMENT_COLLECTION = Object.freeze({
	USERS: new Collection('users', [
		{type: 'hash', fields: []}
	])
});

export const ALL_DOCUMENT_COLLECTIONS: Collection[] = Object.values(DOCUMENT_COLLECTION);
