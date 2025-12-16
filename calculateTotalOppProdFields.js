/**
 * Calculate total opportunity product fields
 */
function calculateTotalOppProdFields(mappingForTotals, mapLaerTotalWithValue, oprod, currencyConversionVar, closeDate) {
    // Step 1: Map LAER fields from Opportunity_Product__c
    for (const laerField in mappingForTotals) {
        const oprodField = mappingForTotals[laerField];
        const amount = oprod && oprod[oprodField] != null ? Number(oprod[oprodField]) : 0;
        mapLaerTotalWithValue[laerField] = (mapLaerTotalWithValue[laerField] || 0) + (amount * currencyConversionVar);
    }

    // Step 2: FY22/FY25 factor for perpetual amounts
    const FY22Start = new Date(2023, 9, 1); // October 1, 2023
    const FY25Start = new Date(2024, 9, 1); // October 1, 2024
    let softwareProdPercentage = 0.5;

    if (closeDate >= FY25Start) {
        softwareProdPercentage = ['China', 'Hong Kong'].includes(oprod.Opportunity__r?.Physical_Country__c) ? 1.0 : 0.25;
    } else if (closeDate > FY22Start) {
        softwareProdPercentage = ['China', 'Hong Kong', 'Taiwan'].includes(oprod.Opportunity__r?.Physical_Country__c) ? 0.75 : 0.50;
    } else {
        softwareProdPercentage = ['China', 'Hong Kong', 'Taiwan'].includes(oprod.Opportunity__r?.Physical_Country__c) ? 1.0 : 0.75;
    }

    // Step 3: Local portion ACV calculations
    if (oprod.SaaS_Annualized_Amount__c != null) {
        mapLaerTotalWithValue['Total_Local_Portion_SaaS_ACV__c'] =
            (mapLaerTotalWithValue['Total_Local_Portion_SaaS_ACV__c'] || 0) + oprod.SaaS_Annualized_Amount__c;
    }
    if (oprod.Subscription_Annualized_Amount__c != null) {
        mapLaerTotalWithValue['Total_Local_Portion_Subscription_ACV__c'] =
            (mapLaerTotalWithValue['Total_Local_Portion_Subscription_ACV__c'] || 0) + oprod.Subscription_Annualized_Amount__c;
    }

    // Step 4: Total 12-months equivalent
    const numberOfPeriods = oprod.Number_Periods__c > 0 ? oprod.Number_Periods__c : 1;
    const totalOpportunity12MthsEquivalent = (
        (oprod.Subscription_Value__c || 0) +
        (oprod.SaaS_Value__c || 0) +
        ((oprod.Training__c || 0) * (oprod.License_Model__c === 'LAAS' ? 1 : 0)) +
        (oprod.Maintenance_Renewal__c || 0) +
        (oprod.HW_Maint__c || 0) +
        (oprod.Back_Maintenance__c || 0)
    ) / numberOfPeriods * 12 * currencyConversionVar;

    mapLaerTotalWithValue['Total_Opportunity_12_Mths_Equivalent__c'] =
        (mapLaerTotalWithValue['Total_Opportunity_12_Mths_Equivalent__c'] || 0) + totalOpportunity12MthsEquivalent;

    return mapLaerTotalWithValue;
}