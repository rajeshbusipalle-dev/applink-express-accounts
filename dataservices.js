/**
 * dataservices.js
 * Salesforce query layer for Heroku AppLink
 */

//const applink = require('@heroku/applink');
//const applink = require('@heroku/applink-sdk');
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

    //const sf = applink.salesforce(applinkContext);
    const sf = applinkContext.org.dataApi;

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
            Id ,Contract.Deal_Event_LAER_roll_down_to_Opps__c,RecordType.name,Opportunity_Type__c,Account.BillingCountry,Indirect_Direct_Lead__c,contract.CurrencyIsoCode,isclosed,ContractId,Annualized_Reorder_Target_Value__c , Split_Opportunity__c,Subscription_End_Date__c,Subscription_Start_Date__c,Original_Target_Value__c ,Original_Target_Period__c , CurrencyIsoCode,CloseDate,RecordType.DeveloperName,StageName,Deal_Event_Override__c,Inside_Salesperson__c,Inside_Sales_Total_Credit_Amount__c,Inside_Sales_2_Total_Credit_Amount__c,Product_Expand_ACV__c,Renewal_Deal_Expand_ACV__c,Land_Add_on_ACV__c,Prospecting1__c,Total_Software_Value__c,Total_Maintenance_Value__c,Back_Maintenance_Value__c,Total_Hardware_Value__c,Total_Services_Value__c,Total_Maint_Renewal__c,Total_Penalty_Fees__c,Total_HW_Maint__c ,
                (Select Id , Variance_Services__c ,License_Type__c,License_Model__c,CurrencyIsoCode,Offering__c ,Offering__r.Segment__c,Offering__r.Callisto_Unit__c,Sub_Total__c,Annualized_Amount__c,Annualized_Amount_SaaS_Subscr__c,Annualized_Amount_LAER__c,SaaS_Value__c,Subscription_Value__c,Start_Date__C,Subscription_End_Date__c,Number_Periods__c,SaaS_Annualized_Amount__c,Subscription_Annualized_Amount__c,Converted_Products__c ,Service__c,software__c,Maintenance__c,Hardware__c ,HW_Maint__c,Offering__r.License_Model__c,Opportunity__r.Physical_Country__c,Training__c,Offering__r.Services_Portfolio_Type__c,opportunity__r.Recordtype.DeveloperName,Maintenance_Renewal__c,Number_Periods_forward__c ,opportunity__R.isclosed,opportunity__r.closedate,Opportunity__r.contractId,Back_Maintenance__c, Opportunity__r.Deal_Event_Override__c,Learning_ACV__c, Cloud_SaaS_ACV__c
                FROM Opportunity_Products__r
                    WHERE (Sub_Total__c > 0 OR Opportunity__r.SBQQ__AmendedContract__c = null  OR (Sub_Total__c < 0  and Opportunity__r.SBQQ__AmendedContract__c != null ))   
                ),

                (SELECT Id,Exclude_from_P2X__c,Replaced_by_X_Solution__c,Maintenance_TCV__c ,license_model__c,Autogen_Opportunity__R.recordType.DeveloperName,Autogen_Opportunity__r.closedate,Autogen_Opportunity__r.contractId,Autogen_Opportunity__r.StageName,Autogen_Opportunity__r.Isclosed,CurrencyIsoCode,Clone_OppID__c,Offering__c , Offering__r.Segment__c , Offering__r.Callisto_Unit__c,Subscription_Period__c,Override_Period_Months__c,Subscription_License_Net__c ,Order_Monthly_Net__c,Targeted_Solution__c,License_Type__c,Total_Line_Maintenance__c,Item_Value__c,Monthly_Net_Maint__c,Offering__r.License_Model__c, Offering__r.Services_Portfolio_Type__c ,Order_Net_Value_ACV__c,SAP_OrderNo__c,Start_Date_Consolidated__c,Monthly_List_License__c,Monthly_List_Maint__c,Quantity__c,Autogen_Opportunity__r.Deal_Event_Override__c, Expiring_ACV__c,Include_Cancelled_LI_Exp_ACV__c,Original_TCV__c,Cancelled_Quantity__c,IsCancelled__c,Original_Period_New__c,End_Date_Consolidated__c, Original_End_Date_Consolidated__c
                FROM SAP_Install_Line_Items__r
                    WHERE IsCancelled__c = false and ( ( Subscription_License_Net__c != null ) or (Monthly_Net_Maint__c !=null))
                ),

                (Select Id ,Total_Expiring_Hardware_ACV__c,Actual_ACV__c,ACV_Actual_Net_New__c,Total_Expiring_Subscription_ACV__c,Total_Expiring_SaaS_ACV__c,Total_Expiring_Maintenance_ACV__c,Total_Expiring_LaaS_ACV__c,Total_Expiring_HSaaS_ACV__c,Base_Renewal_ACV__c,Name,Expiring_ACV__c,Opportunity__c,Product_Expand_ACV__c,Renewal_Deal_Contraction_ACV__c,Renewal_Deal_Expand_ACV__c,Land_Add_on_ACV__c,Expiring_TCV__c,Flippable_Expiring_ACV__c,Flippable_Expiring_TCV__c,Hybrid_SaaS_ACV__c,Hybrid_SaaS_TCV__c,Opportunity_TCV__c,Type__c,Total_Opportunity_ACV__c,Total_Opp_Net_New_ACV__c ,Total_Base_Renewal_ACV__c,Total_Expiring_ACV__c,Total_Product_Expand_ACV__c,Total_Renewal_Contraction_ACV__c,Total_Renewal_Expand_ACV__c ,Total_Land_Add_on_ACV__c,Perp2SaaS_Expiring_ACV__c,Perp2SaaS_Base_Renewal_ACV__c,Perp2SaaS_Opp_Net_New_ACV__c,Perp2SaaS_Opportunity_ACV__c,Perp2SaaS_Product_Expand_ACV__c,Perp2SaaS_Renewal_Contraction_ACV__c,Perp2SaaS_Renewal_Expand_ACV__c,Total_Perp2SaaS_Opportunity_ACV__c, Total_Perp2SaaS_Opp_Net_New_ACV__c  ,Total_Perp2SaaS_Expiring_ACV__c ,Total_Perp2SaaS_Product_Expand_ACV__c ,Total_Perp2SaaS_Renewal_Contraction_ACV__c,Total_Perp2SaaS_Renewal_Expand_ACV__c,Total_Perp2SaaS_Base_Renewal_ACV__c,Total_Base_Renewal__c ,Total_Renewal_Expand__c ,Total_Product_Expand__c ,Total_Land_Add_on__c ,Perp2SaaS_Base_Renewal__c ,Perp2SaaS_Renewal_Expand__c ,Perp2SaaS_Product_Expand__c,Contract_Deal_ID__c,Total_Expiring_12_Mths_Equivalent__c,Total_Cloud__c, Total_Process_B_via_LSDA__c, Total_SAAS_Operations__c,opportunity__R.isclosed,opportunity__r.closedate,opportunity__r.contractId,Target_ACV__c,opportunity__r.Deal_Event_Override__c,Deal_ID_Key__c
                FROM LAER_Tables__r
                    WHERE Name = 'Total')

        FROM Opportunity
        ${whereClause}
    `;
    console.log('@@@ fetchOpportunities_query:',query);
    const res = await sf.query(query);
    console.log('@@@ fetchOpportunities_res:',res);
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

    const sf = applinkContext.org.dataApi;
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
    console.log('@@@ fetchContractLAER_query:',query);
    const res = await sf.query(query);
    console.log('@@@ fetchContractLAER_res:',res);
    return res?.records?.[0] || null;
}

/**
 * Upsert LAER record
 */
async function upsertLAER(req,applinkContext, laerPayload) {
    if (!applinkContext || !laerPayload) {
        throw new Error('Missing parameters for upsertLAER');
    }

    //console.log('@@@ upsertLAER_laerPayload:',laerPayload);
    
    console.log('@@@ upsertLAER_laerPayload after:',laerPayload);

    /* Working with Unit Of Work Example Sample */
    /*

    const dataApi  = applinkContext.org.dataApi;
    // Create a new UnitOfWork instance
    const uow = dataApi.newUnitOfWork();

    // The record payload to create
   // const recordPayload  = normalizeLAERPayload(laerPayload);

   console.log('@@@ upsertLAER_testLAERpayload after:',testLAERpayload);

    // Register the create operation
    //const recordReference = uow.registerUpdate('LAER_Table__c', testLAERpayload);


    uow.registerUpdate({
          type: 'LAER_Table__c',
          fields: {
            id: 'aIK4O000000IRb0WAG',
            total_expiring_maintenance_acv__c: 50000.00,
            total_expiring_laas_acv__c: 1000,
            name: 'Total HEROKU TEST',
            opportunity__c: '0064O00000ugpzlQAA',
            type__c: 'New',
          },
        });

     // Commit the UnitOfWork
    const result = await dataApi.commitUnitOfWork(uow);
       
    console.log('Update successful:', result);
    return result;

     */
    /* Working with Unit Of Work Example */

    /*

    const dataApi  = applinkContext.org.dataApi;

    const testLAERPL = {
        Id: 'aIK4O000000IRb0WAG',  // Correct field name
        Total_Expiring_Maintenance_ACV__c: 50000.00,
        Total_Expiring_LAAS_ACV__c: 1000,
        Name: 'Total HEROKU TEST 2',
        Opportunity__c: '0064O00000ugpzlQAA',
        Type__c: 'New',
        };

        try {
        const result = await dataApi.update(
            'LAER_Table__c',  // Salesforce object API name
            testLAERPL        // Fields to update
        );

        console.log('Update result:', result);

        } catch (err) {
        console.log('Update failed:', err);
        }
        console.log('Update successful:', result);
        return result;
        */


        const updates = [{
        sobject: 'LAER_Table__c',
        id: 'aIK4O000000IRb0WAG',
        fields: {
            total_expiring_maintenance_acv__c: 50000.00,
            total_expiring_laas_acv__c: 1000,
            name: 'Total HEROKU TEST',
            opportunity__c: '0064O00000ugpzlQAA',
            type__c: 'New'
          },
        }];

    // Access dataApi from the app context (Heroku Applink)
    const result = await req.app.salesforce.dataApi.update(updates);

    return result;
               
}

module.exports = {
    fetchOpportunities,
    fetchContractLAER,
    upsertLAER
};
