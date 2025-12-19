/**
 * laerCurrencyUtil.js
 * Complete Apex-equivalent currency utility for Heroku AppLink
 */

const applink = require('@heroku/applink');

/* --------------------------------------------------------------------
 * Apex static variables equivalent
 * ------------------------------------------------------------------*/
let tableBuilt = false;
let currencyRates = {};              // IsoCode -> ConversionRate
let mapcurrency = {};                // curr_new -> rate cache

/* --------------------------------------------------------------------
 * Build CurrencyType conversion table (one-time)
 * ------------------------------------------------------------------*/
function buildCurrencyTable(applinkContext) {
    if (tableBuilt) return;

    console.log('**************** Building the Currency table ******************');

    const sf = applink.salesforce(applinkContext);

    const query = `
        SELECT IsoCode, ConversionRate
        FROM CurrencyType
        WHERE IsActive = true
    `;

    const res = sf.query(query);
    console.log('@@@ buildCurrencyTable_currencyRates : ',currencyRates);
    currencyRates = {};
    for (const currFields of res.records || []) {
        const curr = currFields.fields;
        console.log('@@@ buildCurrencyTable_curr: ',curr);
        currencyRates[curr.IsoCode] = curr.ConversionRate;
    }
    console.log('@@@ buildCurrencyTable_currencyRates : ',currencyRates);
    if (Object.keys(currencyRates).length > 0) {
        tableBuilt = true;
    }
}

/* --------------------------------------------------------------------
 * Apex:
 * public static double convertValue(double value, String oldCur, String newCur)
 * ------------------------------------------------------------------*/
function convertValue(applinkContext, value, oldCur, newCur) {
    buildCurrencyTable(applinkContext);

    let result = 0;

    const oldR = currencyRates[oldCur];
    const newR = currencyRates[newCur];

    console.log(`Old Currency ${oldCur} value: ${oldR}`);
    console.log(`New Currency ${newCur} value: ${newR}`);
    console.log(`Value to Convert: ${value}`);

    if (oldCur === newCur) {
        result = value;
        console.log('No conversion send back the same');
    } else {
        if (value == null) value = 0.0;

        if (newCur === 'USD') {
            result = value / oldR;
            console.log('Single conversion to USD');
        } else {
            result = (value / oldR) * newR;
            console.log('Double conversion');
        }
    }

    console.log(
        `Conversion done, in: ${value} ${oldCur} out: ${result} ${newCur}`
    );

    return result;
}

/* --------------------------------------------------------------------
 * Apex:
 * public static double getCurrencyRateValue(String oldCur, String newCur, Date CurrencyDate)
 * ------------------------------------------------------------------*/
function getCurrencyRateValue(
    applinkContext,
    oldCur,
    newCur,
    currencyDate
) {
    let result = null;

    // ADC disabled – same as your Apex implementation
    result = convertValue(applinkContext, 1.0, oldCur, newCur);

    console.log(
        `Conversion done, in: ${oldCur} out: ${result} ${newCur}`
    );

    return result;
}

/* --------------------------------------------------------------------
 * Apex:
 * Map<String,Double> mapcurrency
 * public Double getConvertedCurrency(String currCurrency, String newCurrency, Date closeDate)
 * ------------------------------------------------------------------*/
function getConvertedCurrency(
    applinkContext,
    currCurrency,
    newCurrency,
    closeDate
) {
    console.log('@@@ getConvertedCurrency_currCurrency',currCurrency);
    let currencyconversionvar = 1;

    if (currCurrency === newCurrency) {
        console.log('@@@ getConvertedCurrency_currencyconversionvar',currencyconversionvar);
        return currencyconversionvar;
    }
    
    const key = `${currCurrency}_${newCurrency}`;

    console.log('@@@ getConvertedCurrency_key',key);

    if (mapcurrency[key] !== undefined) {
        currencyconversionvar = mapcurrency[key];
    } else {
        currencyconversionvar = getCurrencyRateValue(
            applinkContext,
            newCurrency,
            currCurrency,
            closeDate
        );

        mapcurrency[key] = currencyconversionvar;
    }

    return currencyconversionvar;
}

/* --------------------------------------------------------------------
 * Utilities
 * ------------------------------------------------------------------*/
function resetCurrencyCache() {
    tableBuilt = false;
    currencyRates = {};
    mapcurrency = {};
}

module.exports = {
    convertValue,
    getCurrencyRateValue,
    getConvertedCurrency,
    resetCurrencyCache
};
