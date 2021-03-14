import * as joi from 'joi';

export class RangeModel implements Foxx.Model {

	schema = joi.object().keys({
		minimumValue: joi.any(),
		exactValue: joi.any(),
		maximumValue: joi.any()
	});
}

export interface Range {
	minimumValue: any;
	exactValue: any;
	maximumValue: any;
}
