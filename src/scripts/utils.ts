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
			} else if (module.context.isProduction) {
				console.debug(`collection ${qualifiedName} already exists. Leaving it untouched.`);
			}
		}
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
