import * as joi from 'joi';
import { RangeModel, Range } from './range';
import { Selector } from './selector';

export class FilterModel implements Foxx.Model {

	schema = joi.object().keys({
		selector: joi.string(),
		range: new RangeModel().schema
	});
}

export interface Filter {
	selector: Selector;
	range: Range;
}
