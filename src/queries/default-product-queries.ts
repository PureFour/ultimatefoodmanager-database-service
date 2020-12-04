import {injectable} from 'inversify';
import {DOCUMENT_COLLECTION} from '../models/enums/document-collections';
import {aql, db} from '@arangodb';
import {Product} from '../models/web/product';

const productCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.PRODUCTS.collection;

@injectable()
export class DefaultProductQueries implements ProductQueries {

	public addProduct = (product: Product): Product => {
		return db._query(aql`
            INSERT ${product}
            IN ${productCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public findProduct = (barcode: string): Product => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.barcode == ${barcode}
            RETURN product
      	`).toArray()[0];
	};

	public getProduct = (productUuid: string): Product => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.uuid == ${productUuid}
            RETURN product
      	`).toArray()[0];
	};

	public getAllProducts = (): Product[] => {
		return db._query(aql`
            FOR product IN ${productCollection}
            RETURN product
      	`).toArray();
	};

	public deleteProduct = (productUuid: string): Product => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.uuid == ${productUuid}
            REMOVE product IN ${productCollection}
            LET removed = OLD
            RETURN removed
      	`).toArray()[0];
	};
}

export interface ProductQueries {
	addProduct: (product: Product) => Product;
	findProduct: (productName: string) => Product;
	getProduct: (productUuid: string) => Product;
	getAllProducts: () => Product[];
	deleteProduct: (productUuid: string) => Product;
}