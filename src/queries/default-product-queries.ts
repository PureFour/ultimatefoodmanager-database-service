import { injectable } from 'inversify';
import { DOCUMENT_COLLECTION } from '../models/enums/document-collections';
import { aql, db } from '@arangodb';
import { AssociatedProduct } from '../models/internal/associated-product';
import { InternalProduct } from '../models/internal/internal-product';
import { Container } from '../models/internal/container';
import { UTILS_SERVICE } from '../services/util-service';
import { ProductCard } from '../models/web/product-card';

const productCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.PRODUCTS.collection;
const productCardsCollection: ArangoDB.Collection = DOCUMENT_COLLECTION.PRODUCT_CARDS.collection;
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

	public updateContainer = (newContainer: Container): void => {
		db._query(aql`
            FOR container IN ${containersCollection}
			FILTER container.uuid == ${newContainer.uuid}
			UPDATE container
			WITH ${newContainer}
			IN ${containersCollection}
      	`);
	};

	public deleteContainer = (containerUuid: string): void => {
		db._query(aql`
            FOR container IN ${containersCollection}
            FILTER container.uuid == ${containerUuid}
            REMOVE container IN ${containersCollection}
      	`);
	};

	public addProduct = (product: InternalProduct, containerUuid: string): InternalProduct => {
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

	public updateProduct = (newProduct: InternalProduct): void => {
		db._query(aql`
			FOR product IN ${productCollection}
			FILTER product._key == ${newProduct._key}
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

	public findProduct = (containerProductsUuids: string[], barcode: string): InternalProduct => {
		return db._query(aql`
            FOR product IN ${productCollection}
            FILTER product.uuid IN ${containerProductsUuids} && product.productCard.barcode == ${barcode}
            RETURN product
      	`).toArray()[0];
	};

	public getProduct = (productUuid: string): InternalProduct => {
		return db._query(aql`
			LET result = (
		    	FOR product IN ${productCollection}
        			RETURN product.uuid == ${productUuid} ? product : FIRST(SORTED_UNIQUE(
            			FOR associatedProduct IN product.associatedProducts
                			FILTER associatedProduct.uuid == ${productUuid}
                			RETURN {
	            	  			uuid: associatedProduct.uuid,
	            				productCard: product.productCard,
	            				quantity: associatedProduct.quantity,
	            				metadata: associatedProduct.metadata
	            	   		}
            		))
			)
			RETURN LAST(SORTED_UNIQUE(result))
      	`).toArray()[0];
	};

	public getFullProduct = (productUuid: string): InternalProduct => {
		return db._query(aql`
			LET result = (
		    	FOR product IN ${productCollection}
        			RETURN DISTINCT product.uuid == ${productUuid} ? product : FIRST(SORTED_UNIQUE(
            			FOR associatedProduct IN product.associatedProducts
                			FILTER associatedProduct.uuid == ${productUuid}
                			RETURN product
            		))
			)
			RETURN LAST(SORTED_UNIQUE(result))
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
            		productCard: mainProduct.productCard,
            		quantity: associatedProduct.quantity,
            		metadata: associatedProduct.metadata
            	}
            )
            RETURN PUSH(associatedProducts, UNSET(mainProduct, "associatedProducts"))
      	`).toArray();
	};


	public deleteFullProduct = (productUuid: string, containerUuid: string): InternalProduct => {
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

	public findGlobalProductCard = (barcode: string): ProductCard => {
		return db._query(aql`
            FOR productCard IN ${productCardsCollection}
            FILTER productCard.barcode == ${barcode}
            RETURN UNSET(productCard, "_id", "_rev", "_key")
      	`).toArray()[0];
	};

	public addGlobalProductCard = (productCard: ProductCard): ProductCard => {
		return db._query(aql`
            INSERT ${productCard}
            IN ${productCardsCollection}
            RETURN NEW
      	`).toArray()[0];
	};

	public updateGlobalProductCard = (productCard: ProductCard): void => {
		db._query(aql`
            FOR productCard IN ${productCardsCollection}
			FILTER productCard.barcode == ${productCard.barcode}
			UPDATE productCard
			WITH ${productCard}
			IN ${productCardsCollection}
      	`);
	};
}

export interface ProductQueries {
	createContainer: (userUuid: string) => Container;
	findContainer: (userUuid: string) => Container;
	updateContainer: (container: Container) => void;
	deleteContainer: (containerUuid: string) => void;
	addProduct: (product: InternalProduct, containerUuid: string) => InternalProduct;
	updateProduct: (product: InternalProduct) => void;
	addAssociatedProduct: (productUuid: string, associatedProduct: AssociatedProduct) => InternalProduct;
	findProduct: (containerProductsUuids: string[], barcode: string) => InternalProduct;
	getProduct: (productUuid: string) => InternalProduct;
	getFullProduct: (productUuid: string) => InternalProduct;
	getAllProductsWithinProduct: (_containerUuid: string) => InternalProduct[];
	deleteFullProduct: (productUuid: string, containerUuid: string) => InternalProduct;
	findGlobalProductCard: (barcode: string) => ProductCard;
	addGlobalProductCard: (productCard: ProductCard) => ProductCard;
	updateGlobalProductCard: (productCard: ProductCard) => void;
}