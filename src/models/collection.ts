import {Index} from './db-index';

export class Collection {
	constructor(public name: string, public indexes: Index[]) {}
}
