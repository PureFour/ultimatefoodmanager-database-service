import IndexType = ArangoDB.IndexType;

export class Index {
	constructor(public type: IndexType, public fields: string[], public unique: boolean, public deduplicate: boolean) {
	}
}
