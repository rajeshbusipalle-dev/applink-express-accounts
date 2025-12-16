
/**
 * Fully ported logic for getExpiringInitialEventACV
 */
function getExpiringInitialEventACV(oprod) {
    let ret = 0;
    const OppId = oprod.Autogen_Opportunity__c;

    // Retrieve or initialize order amounts map
    const orderAmountMap = mapOppIdWithInitialOrderAmounts.get(OppId) || new Map();

    let OrderTotalAmount = 0;
    if (['Extended', 'Hardware', 'Backup', 'QA-Test', 'WAN Licens'].includes(oprod.License_Type__c) && oprod.Total_Line_Maintenance__c != null) {
        OrderTotalAmount = oprod.Total_Line_Maintenance__c;
    } else if (['Subscriptn', 'Annual', 'HSAS', 'HSaaS', 'Rental', 'PLC/ALC'].includes(oprod.License_Type__c) && oprod.Order_Net_Value_ACV__c != null) {
        OrderTotalAmount = oprod.Order_Net_Value_ACV__c;
    }

    // Update order amount map
    if (orderAmountMap.has(oprod.SAP_OrderNo__c)) {
        orderAmountMap.set(oprod.SAP_OrderNo__c, (orderAmountMap.get(oprod.SAP_OrderNo__c) || 0) + OrderTotalAmount);
    } else {
        orderAmountMap.set(oprod.SAP_OrderNo__c, OrderTotalAmount);
    }
    mapOppIdWithInitialOrderAmounts.set(OppId, orderAmountMap);

    // Handle initial orders map
    const mapInitialOrder = mapOppIdWithInitialOrders.get(OppId) || new Map();
    const currPeriod = oprod.Override_Period_Months__c || 0;
    const currStartDateValue = oprod.Start_Date_Consolidated__c ? oprod.Start_Date_Consolidated__c.getTime() : 0;
    let currentIdentifier = null;

    // Find existing identifier
    if (mapInitialOrder.size > 0) {
        const [existingId] = mapInitialOrder.keys();
        const [periodStr, startDateStr] = existingId.split('__');
        const period = Number(periodStr);
        const startDateValue = Number(startDateStr);

        if (period < currPeriod || (period === currPeriod && currStartDateValue < startDateValue)) {
            // Reset map for new earliest period
            mapInitialOrder.clear();
        }
        currentIdentifier = `${currPeriod}__${currStartDateValue}`;
        if (!mapInitialOrder.has(currentIdentifier)) mapInitialOrder.set(currentIdentifier, new Set());
        mapInitialOrder.get(currentIdentifier).add(oprod.SAP_OrderNo__c);
    } else {
        currentIdentifier = `${currPeriod}__${currStartDateValue}`;
        mapInitialOrder.set(currentIdentifier, new Set([oprod.SAP_OrderNo__c]));
    }

    mapOppIdWithInitialOrders.set(OppId, mapInitialOrder);

    // Sum amounts for all orders in current initial order
    const ordersSet = mapInitialOrder.get(currentIdentifier) || new Set();
    for (const orderNo of ordersSet) {
        ret += orderAmountMap.get(orderNo) || 0;
    }

    return ret;
}