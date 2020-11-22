import {ALL_DOCUMENT_COLLECTIONS} from '../models/enums/document-collections';
import {ALL_EDGE_COLLECTIONS} from '../models/enums/edge-collections';
import {SETUP_UTILS} from './utils';

SETUP_UTILS.createCollections(ALL_DOCUMENT_COLLECTIONS);
SETUP_UTILS.createCollections(ALL_EDGE_COLLECTIONS);

SETUP_UTILS.upsertServiceUser('root', 'default-database');
