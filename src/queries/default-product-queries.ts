import { injectable } from 'inversify';
import { DOCUMENT_COLLECTION } from '../models/enums/document-collections';
import { aql, db } from '@arangodb';
import { Product } from '../models/web/product';
import { AssociatedProduct } from '../models/internal/associated-product';
import { InternalProduct } from '../models/internal/internal-product';
import { Container } from '../models/internal/container';
import { UTILS_SERVICE } from '../services/util-service';

const productCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.PRODUCTS.collection;
const containersCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.CONTAINERS.collection;

@injectable()
export class DefaultProductQueries implements ProductQueries {

	public createContainer = (userUuid: string): Container => {
		return db._query(aql`
            INSERT {
            	uuid: ${UTILS_SERVICE.generateUuid()},
            	userUuid: ${userUuid},
            	products: []
            }
            IN ${containersCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public findContainer = (userUuid: string): Container => {
		return db._query(aql`
           	FOR container IN ${containersCollection}
           	FILTER container.userUuid == ${userUuid}
            RETURN container
      	`).toArray()[0];
	};

	public addProduct = (product: Product, containerUuid: string): InternalProduct => {
		return db._query(aql`
			FOR container IN ${containersCollection}
			FILTER container.uuid == ${containerUuid}
			UPDATE container
			WITH { products: PUSH(container.products, ${product.uuid}) }
			IN ${containersCollection}

            INSERT ${product}
            IN ${productCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public updateProduct = (newProduct: Product): void => {
		db._query(aql`
			FOR product IN ${productCollection}
			FILTER product.uuid == ${newProduct.uuid}
			UPDATE product
			WITH ${newProduct}
			IN ${productCollection}
      	`);
	};

	public addAssociatedProduct = (productUuid: string, associatedProduct: AssociatedProduct): InternalProduct => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.uuid == ${productUuid}
            UPDATE product
            WITH { associatedProducts: PUSH(product.associatedProducts, ${associatedProduct}) }
            IN ${productCollection} OPTIONS { keepNull: false }
			RETURN NEW
      	`).toArray()[0];
	};

	public findProduct = (barcode: string): InternalProduct => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.barcode == ${barcode}
            RETURN product
      	`).toArray()[0];
	};

	public getProduct = (productUuid: string): InternalProduct => {
		return db._query(aql`
			LET result = (
		    	FOR product IN ${productCollection}
        			RETURN product.uuid == ${productUuid} ? product : FIRST(
            			FOR associatedProduct IN product.associatedProducts
                			FILTER associatedProduct.uuid == ${productUuid}
                			RETURN {
	            	  			uuid: associatedProduct.uuid,
	            				name: product.name,
	            				brand: product.brand,
	            				photoUrl: product.photoUrl,
	            				barcode: product.barcode,
	            				category: product.category,
	            				price: product.price,
	            				totalQuantity: product.totalQuantity,
	            				quantity: associatedProduct.quantity,
	            				measurementUnit: product.measurementUnit,
	            				nutriments: product.nutriments,
	            				metadata: associatedProduct.metadata
	            	   		}
            		)
			)
			RETURN LAST(result)
      	`).toArray()[0];
	};

	public getFullProduct = (productUuid: string): InternalProduct => {
		return db._query(aql`
			LET result = (
		    	FOR product IN ${productCollection}
        			RETURN DISTINCT product.uuid == ${productUuid} ? product : FIRST(
            			FOR associatedProduct IN product.associatedProducts
                			FILTER associatedProduct.uuid == ${productUuid}
                			RETURN product
            		)
			)
			RETURN LAST(result)
      	`).toArray()[0];
	};

	public getAllProductsWithinProduct = (productUuid: string): InternalProduct[] => {
		return db._query(aql`
			LET productResult = (
            	FOR product IN ${productCollection}
            	FILTER product.uuid == ${productUuid}
            	RETURN product
            )
            LET mainProduct = FIRST(productResult)
            LET associatedProducts = (
            	FOR associatedProduct IN mainProduct.associatedProducts
            	RETURN {
            		uuid: associatedProduct.uuid,
            		name: mainProduct.name,
            		brand: mainProduct.brand,
            		photoUrl: mainProduct.photoUrl,
            		barcode: mainProduct.barcode,
            		category: mainProduct.category,
            		price: mainProduct.price,
            		totalQuantity: mainProduct.totalQuantity,
            		quantity: associatedProduct.quantity,
            		measurementUnit: mainProduct.measurementUnit,
            		nutriments: mainProduct.nutriments,
            		metadata: associatedProduct.metadata
            	}
            )
            RETURN PUSH(associatedProducts, UNSET(mainProduct, "associatedProducts"))
      	`).toArray();
	};


	public deleteProduct = (productUuid: string, containerUuid: string): InternalProduct => {
		// TODO gdy usuwany jest associated to update w drzewie i zmiana uuid w container!
		return db._query(aql`
			FOR container IN ${containersCollection}
			FILTER container.uuid == ${containerUuid}
			UPDATE container
			WITH { products: REMOVE_VALUE(container.products, ${productUuid}) }
			IN ${containersCollection}

            FOR product IN ${productCollection}
            FILTER product.uuid == ${productUuid}
            REMOVE product IN ${productCollection}
            LET removed = OLD
            RETURN removed
      	`).toArray()[0];
	};
}

export interface ProductQueries {
	createContainer: (userUuid: string) => Container;
	findContainer: (userUuid: string) => Container;
	addProduct: (product: Product, containerUuid: string) => InternalProduct;
	updateProduct: (product: Product) => void;
	addAssociatedProduct: (productUuid: string, associatedProduct: AssociatedProduct) => InternalProduct;
	findProduct: (productName: string) => InternalProduct;
	getProduct: (productUuid: string) => InternalProduct;
	getFullProduct: (productUuid: string) => InternalProduct;
	getAllProductsWithinProduct: (_containerUuid: string) => InternalProduct[];
	deleteProduct: (productUuid: string, containerUuid: string) => InternalProduct;
}