import { injectable } from 'inversify';
import { User } from '../models/web/user/user';
import { DOCUMENT_COLLECTION } from '../models/enums/document-collections';
import { aql, db } from '@arangodb';

const userCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.USERS.collection;

@injectable()
export class DefaultUserQueries implements UserQueries {


	public getUser = (uuid: string): User => {
		return db._query(aql`
            FOR user IN ${userCollection}
            FILTER user.uuid == ${uuid}
            RETURN UNSET(user, "_id", "_rev", "_key")
      	`).toArray()[0];
	};

	public findUser = (email: string, login?: string): User => {
		return db._query(aql`
            FOR user IN ${userCollection}
            FILTER user.email == ${email} || user.login == ${login}
            RETURN UNSET(user, "_id", "_rev", "_key")
      	`).toArray()[0];
	};

	public addUser = (user: User): User => {
		return db._query(aql`
            INSERT ${user}
            IN ${userCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public deleteUser = (uuid: string): void => {
		return db._query(aql`
            FOR user IN ${userCollection}
            FILTER user.uuid == ${uuid}
            REMOVE user IN ${userCollection}
  			RETURN OLD
      	`).toArray()[0];
	};
}

export interface UserQueries {
	getUser: (uuid: string) => User;
	findUser: (email: string, login: string) => User;
	addUser: (user: User) => User;
	deleteUser: (uuid: string) => void;
}