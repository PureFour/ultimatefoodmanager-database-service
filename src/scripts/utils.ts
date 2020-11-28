import {db} from '@arangodb';
import {Collection} from '../models/collection';

// tslint:disable-next-line:no-var-requires
const users = require('@arangodb/users');

export const SETUP_UTILS = {

	createCollections: (collections: Collection[]): void => {
		for (const collection of collections) {
			const qualifiedName = module.context.collectionName(collection.name);
			if (!db._collection(qualifiedName)) {
				db._createDocumentCollection(qualifiedName);
				SETUP_UTILS.indexCollection(collection);
			} else if (module.context.isProduction) {
				console.debug(`collection ${collection.name} already exists. Leaving it untouched.`);
			}
		}
	},

	indexCollection: (collection: Collection): void => {
		const qualifiedName = module.context.collectionName(collection.name);
		collection.indexes.forEach(
			index => {
				console.debug(`setup collection ${qualifiedName} index: [${index.type} => ${index.fields}]`);
				db._collection(qualifiedName).ensureIndex({...index});
			}
		);
	},

	dropCollections: (collections: Collection[]): void => {
		for (const collection of collections) {
			const qualifiedName = module.context.collectionName(collection.name);
			if (!db._collection(qualifiedName)) {
				db._dropDatabase(qualifiedName);
			}
		}
	},

	upsertServiceUser: (username: string, databaseName: string): void => {
		if (!users.exists(username)) {
			console.log(`User ${username} does not exist, creating it.`);
			users.save(username, process.env.ARANGO_ROOT_PASSWORD, true);
			users.grantDatabase(username, databaseName, 'rw');
			users.grantCollection(username, databaseName, '*', 'rw');
		}
	}
};
