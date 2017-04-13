/**
 * @constructor
 * @param {number|string|BigNumber} value
 * @param {number} [base]
 */
function BigNumber(value, base){}

/**
 * @this {BigNumber}
 * @return {BigNumber}
 */
BigNumber.prototype.abs = function(){};

/**
 * @this {BigNumber}
 * @param {number|string|BigNumber} value
 * @param {number} [base]
 * @return {BigNumber}
 */
BigNumber.prototype.plus = function(value, base){};

/**
 * @this {BigNumber}
 * @param {number|string|BigNumber} value
 * @param {number} [base]
 * @return {BigNumber}
 */
BigNumber.prototype.minus = function(value, base){};

/**
 * @this {BigNumber}
 * @param {number|string|BigNumber} value
 * @param {number} [base]
 * @return {BigNumber}
 */
BigNumber.prototype.times = function(value, base){};

/**
 * @this {BigNumber}
 * @param {number|string|BigNumber} value
 * @param {number} [base]
 * @return {BigNumber}
 */
BigNumber.prototype.dividedBy = function(value, base){};

/**
 * @this {BigNumber}
 * @param {number|string|BigNumber} value
 * @param {number} [base]
 * @return {boolean}
 */
BigNumber.prototype.lt = function(value, base){};

/**
 * @this {BigNumber}
 * @return {number}
 */
BigNumber.prototype.toNumber = function(){};

/**
 * @this {BigNumber}
 * @param {number} dp
 * @param {number} [rm]
 * @return {BigNumber}
 */
BigNumber.prototype.round = function(dp, rm){};
