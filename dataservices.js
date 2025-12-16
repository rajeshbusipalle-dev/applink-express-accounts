/**
 * dataservices.js
 * Salesforce query layer for Heroku AppLink
 */

const applink = require('@heroku/applink');

/**
 * Fetch Opportunities (Apex-parity SOQL)
 */
async function fetchOpportunities({
    applinkContext,
    oppId,
    contractId,
    closeMM,
    closeYYYY,
    isClosedOnly
}) {
    if (!applinkContext) {
        throw new Error('Missing AppLink context');
    }

    const sf = applink.salesforce(applinkContext);

    const whereConditions = [];

    if (oppId) {
        whereConditions.push(`Id = '${oppId}'`);
    }

    if (contractId && closeMM && closeYYYY) {
        whereConditions.push(`
            (
                ContractId = '${contractId}'
                AND CALENDAR_MONTH(CloseDate) = ${closeMM}
                AND CALENDAR_YEAR(CloseDate) = ${closeYYYY}
            )
        `);
    }

    if (isClosedOnly === true) {
        whereConditions.push(`IsClosed = true`);
    }

    const whereClause =
        whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' OR ')}`
            : '';

    const query = `
        SELECT
            Id,
            CurrencyIsoCode,
            CloseDate,

            (SELECT
                Id,
                CurrencyIsoCode,
                SaaS_Annualized_Amount__c,
                Subscription_Annualized_Amount__c
             FROM Opportunity_Products__r),

            (SELECT
                Id,
                CurrencyIsoCode,
                Order_Net_Value_ACV__c,
                Subscription_License_Net__c,
                Item_Value__c
             FROM SAP_Install_Line_Items__r),

            (SELECT
                Id,
                Name
             FROM LAER_Tables__r
             WHERE Name = 'Total')

        FROM Opportunity
        ${whereClause}
    `;

    const res = await sf.query(query);
    return res?.records || [];
}

/**
 * Fetch Contract LAER record
 */
async function fetchContractLAER({
    applinkContext,
    contractId,
    dealId
}) {
    if (!applinkContext || !contractId) {
        throw new Error('Missing parameters for fetchContractLAER');
    }

    const sf = applink.salesforce(applinkContext);
    const dealName = dealId ? dealId.split('__')[0] : null;

    const query = `
        SELECT
            Id,
            (SELECT
                Id,
                Name
             FROM LAER_Table__r
             WHERE Deal_ID_Key__c != null
             AND Type__c = 'Deal Event Total'
             ${dealName ? `AND Name = '${dealName}'` : ''}
            )
        FROM Contract
        WHERE Id = '${contractId}'
    `;

    const res = await sf.query(query);
    return res?.records?.[0] || null;
}

/**
 * Upsert LAER record
 */
async function upsertLAER(applinkContext, laerPayload) {
    if (!applinkContext || !laerPayload) {
        throw new Error('Missing parameters for upsertLAER');
    }

    const sf = applink.salesforce(applinkContext);

    return sf
        .sobject('LAER_Table__c')
        .upsert(laerPayload, 'Id');
}

module.exports = {
    fetchOpportunities,
    fetchContractLAER,
    upsertLAER
};
