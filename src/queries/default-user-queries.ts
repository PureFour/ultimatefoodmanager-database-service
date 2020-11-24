import { injectable } from 'inversify';
import { User } from '../models/web/user';
import { DOCUMENT_COLLECTION } from '../models/enums/document-collections';
import { aql, db } from '@arangodb';

const userCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.USERS.collection;

@injectable()
export class DefaultUserQueries implements UserQueries {


	public getUser = (uuid: string): User => {
		return db._query(aql`
            FOR user IN ${userCollection}
            FILTER user.uuid == ${uuid}
            RETURN user
      	`).toArray()[0];
	};

}

export interface UserQueries {
	getUser: (uuid: string) => User;
}