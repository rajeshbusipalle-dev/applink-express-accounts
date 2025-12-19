/**
 * laerFutureController.js
 * Node.js equivalent of LAERFutureController Apex class
 * Compatible with Express + Heroku AppLink
 */

const {
    fetchOpportunities,
    fetchContractLAER,
    upsertLAER
} = require('./dataservices');

const {
    calculateTotalOppProdFields,
    calculateTotalInstallfields
} = require('./calculateLAERTotalfields');

const { getConvertedCurrency } = require('./laerCurrencyUtil');

/**
 * Main entry method invoked from index.js
 */
async function calculateLAERTotalfields({
    applinkContext,
    recId,
    closeDate,
    sobjectType,
    dealId
}) {
    if (!applinkContext) {
        throw new Error('AppLink context is required');
    }

    if (!recId || !sobjectType) {
        throw new Error('recId and sobjectType are required');
    }

    console.log('START calculateLAERTotalfields:',recId);

    const oppId = sobjectType === 'opportunity' ? recId : null;
    const contractId = sobjectType === 'contract' ? recId : null;

    let closeYYYY = null;
    let closeMM = null;

    if (sobjectType === 'contract' && dealId) {
        const datePart = dealId.split(' ')[0];
        const parts = datePart.split('-');

        if (parts.length >= 2) {
            closeYYYY = Number(parts[0]);
            closeMM = Number(parts[1]);
        }
    }

    /* ---- Field Mappings ---- */

    const mappingforTotals = {
        Total_SaaS_ACV__c: 'SaaS_Annualized_Amount__c',
        Total_Subscription_ACV__c: 'Subscription_Annualized_Amount__c'
    };

    const mappingforLineItemTotals = {
        Total_Expiring_Subscription_ACV__c: 'Order_Net_Value_ACV__c',
        Total_Expiring_SaaS_ACV__c: 'Item_Value__c',
        Total_Expiring_Subscription_TCV__c: 'Subscription_License_Net__c'
    };

    let mapLaerTotalWithValue = {};
    let mapLaerTotalWithInstallValue = {};

    /* ---- Fetch Opportunities ---- */

    const opportunities = await fetchOpportunities({
        applinkContext,
        oppId,
        contractId,
        closeMM,
        closeYYYY,
        isClosedOnly: dealId ? dealId.includes('Closed Won') : false
    });

    console.log(
    'SOQL raw response:',
    JSON.stringify(opportunities, null, 2)
);

    if (!opportunities || opportunities.length === 0) {
        console.log('No opportunities found');
        return {};
    }

    /* ---- Calculate Totals ---- */

    for (const opp of opportunities) {
        try{
        //const oppProducts = opp.Opportunity_Products__r?.records || [];
        const oppFields = opp.fields;
        const oppProducts = opp?.subQueryResults?.opportunity_products__r?.records || [];
        //const installItems = opp.SAP_Install_Line_Items__r?.records || [];
        const installItems = opp?.subQueryResults?.SAP_Install_Line_Items__r?.records || [];
        console.log('@@@ calculateLAERTotalfields.oppProducts:',JSON.stringify(oppProducts));
        console.log('@@@ calculateLAERTotalfields.installItems:',JSON.stringify(installItems));
        
        for (const oprodFields of oppProducts) {
            const oprod = oprodFields.fields;
            console.log('@@@ calculateLAERTotalfields.oppProducts.oprod:',oprod);
            
            const rate = await getConvertedCurrency(
                oppFields.CurrencyIsoCode,
                oprod.CurrencyIsoCode,
                oppFields.CloseDate
            );
            
            //const rate = 1;
            console.log('@@@ Convertion Rate : ',rate);
            mapLaerTotalWithValue = calculateTotalOppProdFields(
                mappingforTotals,
                mapLaerTotalWithValue,
                oprod,
                rate,
                oppFields.CloseDate
            );
        }
        /*
        for (const liFields of installItems) {
            const li = liFields.fields;
            console.log('@@@ calculateLAERTotalfields.oppProducts.li:',li);
            const rate = await getConvertedCurrency(
                opp.CurrencyIsoCode,
                li.CurrencyIsoCode,
                opp.CloseDate
            );

            mapLaerTotalWithInstallValue = calculateTotalInstallfields(
                mappingforLineItemTotals,
                mapLaerTotalWithInstallValue,
                li,
                rate,
                opp.CloseDate
            );
        }
        */
        }
       catch (error) {
            console.error('Error message:', error.message);
            console.error('Stack trace:', error.stack);
            }
    }

    /* ---- Build LAER Record ---- */

    let laerRecord;

    if (sobjectType === 'opportunity') {
        const existing = opportunities[0].LAER_Tables__r?.records
            ? opportunities[0].LAER_Tables__r?.records[0]
            : null;
        console.log('@@@ Existing LAER : ',existing);
        laerRecord = existing
            ? { Id: existing.Id }
            : { Name: 'Total', Opportunity__c: oppId };
    } else {
        const contract = await fetchContractLAER({
            applinkContext,
            contractId,
            dealId
        });

        const existing = opportunities[0].LAER_Tables__r?.records
            ? opportunities[0].LAER_Tables__r?.records[0]
            : null;

        laerRecord = existing
            ? { Id: existing.Id }
            : {
                Name: dealId ? dealId.split('__')[0] : 'Total',
                Contract_Deal_ID__c: contractId
            };
    }

    Object.assign(
        laerRecord,
        mapLaerTotalWithValue,
        mapLaerTotalWithInstallValue
    );

    console.log('@@@ UPSERT LAER RECORD:', laerRecord);

    await upsertLAER(applinkContext, laerRecord);

    console.log('END calculateLAERTotalfields');

    return laerRecord;
}

module.exports = {
    calculateLAERTotalfields
};
