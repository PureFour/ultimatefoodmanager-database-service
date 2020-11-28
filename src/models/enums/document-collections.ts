import {Collection} from '../collection';

export const DOCUMENT_COLLECTION = Object.freeze({
	USERS: new Collection('users', [
		{type: 'hash', fields: ['uuid'], unique: true, deduplicate: false}
	])
});

export const ALL_DOCUMENT_COLLECTIONS: Collection[] = Object.values(DOCUMENT_COLLECTION);
