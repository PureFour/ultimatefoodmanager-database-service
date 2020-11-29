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
}

export interface ProductQueries {
	addProduct: (product: Product) => Product;
	findProduct: (productName: string) => Product;
}