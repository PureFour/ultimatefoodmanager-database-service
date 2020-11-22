import {ALL_DOCUMENT_COLLECTIONS} from '../models/enums/document-collections';
import {ALL_EDGE_COLLECTIONS} from '../models/enums/edge-collections';
import {SETUP_UTILS} from './utils';

SETUP_UTILS.dropCollections(ALL_DOCUMENT_COLLECTIONS);
SETUP_UTILS.dropCollections(ALL_EDGE_COLLECTIONS);
