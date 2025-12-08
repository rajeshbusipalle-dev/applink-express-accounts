const applink = require('applink-sdk'); // Assuming AppLink SDK is installed

/**
 * Compute Secondary Compensation based on wrapper and metadata
 * @param {Object} lw - LAERWithOppWrapper object
 * @param {Object} meta - LAER_Allocation_Field_Mapping__mdt object
 * @param {Object} laer - LAER_Table__c record
 * @returns {Number} Secondary Compensation value
 */
function getSecCompfromWrap(lw, meta, laer) {
    if (!laer || !meta) return 0;
    const dealRollDown = lw?.isDealEventRolldown ?? true;

    // Total Portfolio Unit
    if (meta.Portolfio_Unit_Name__c === 'Total') {
        return lw?.[meta.Sales_Id__c] || 0;
    }

    const allocationName = meta.Allocation_Name__c || '';
    let secComp = 0;

    try {
        if (allocationName.includes('Perpetual Expiring ACV')) {
            secComp = (laer.PU_T2X_Exp_ACV_from_Perpetual__c > 0 && laer.T2X_Expiring_ACV__c > 0)
                ? ((laer.PU_T2X_Exp_ACV_from_Perpetual__c / laer.T2X_Expiring_ACV__c) * 100)
                : 0;

        } else if (allocationName.includes('Growth Rate')) {
            if (allocationName.includes('T2X')) {
                secComp = laer[meta.Commission_Field__c] || 0;
            } else if (allocationName.includes('P2X')) {
                if (!laer.Perp2SaaS_Opportunity_ACV__c || laer.Perp2SaaS_Opportunity_ACV__c === 0) {
                    secComp = 0;
                } else {
                    secComp = dealRollDown
                        ? Math.max(laer.PU_Std_Perp2SaaS_Growth_Rate_Deal_Event__c || 0, 0)
                        : laer.Perp2SaaS_Expiring_ACV__c > 0
                            ? ((laer.StdPerp2SaaSRenewalExpandACV__c || 0) + (laer.Std_Perp2SaaS_Product_Expand_ACV__c || 0)) / laer.Perp2SaaS_Expiring_ACV__c * 100
                            : 100;
                }
            } else {
                secComp = !laer.Actual_ACV__c || laer.Actual_ACV__c === 0
                    ? 0
                    : dealRollDown
                        ? Math.max(laer.PU_Std_Growth_Rate_Deal_Event__c || 0, 0)
                        : laer.Expiring_ACV__c > 0
                            ? ((laer.Std_Renewal_Expand_ACV__c || 0) + (laer.Std_Product_Expand_ACV__c || 0)) / laer.Expiring_ACV__c * 100
                            : 0;
            }

        } else if (allocationName.includes('Renewal Rate')) {
            if (allocationName.includes('T2X')) {
                secComp = laer[meta.Commission_Field__c] || 0;
            } else if (allocationName.includes('P2X')) {
                secComp = dealRollDown
                    ? Math.min(laer.PU_Std_Perp2SaaS_Ren_Rate_Deal_Event__c || 0, 100)
                    : laer.Perp2SaaS_Expiring_ACV__c > 0
                        ? ((laer.StdPerp2SaaSBaseRenewalACV__c || 0) / laer.Perp2SaaS_Expiring_ACV__c) * 100
                        : 0;
            } else {
                secComp = dealRollDown
                    ? Math.min(laer.PU_Std_Ren_Rate_Deal_Event__c || 0, 100)
                    : laer.Expiring_ACV__c > 0
                        ? ((laer.Std_Base_Renewal_ACV__c || 0) / laer.Expiring_ACV__c) * 100
                        : 0;
            }

        } else {
            secComp = laer[meta.Commission_Field__c] || 0;
        }
    } catch (err) {
        console.error('Error computing Secondary Compensation:', err.message);
    }

    return Number(secComp.toFixed(2));
}

/**
 * Sync Allocations from LAER Table to Salesforce via AppLink
 * @param {Array} laerRecords - List of LAER Table records
 * @param {Array} listLAERWrapperwithOpp - List of LAERWithOppWrapper
 */
async function syncAllocationsFromLAER(laerRecords, listLAERWrapperwithOpp) {
    if (!laerRecords || laerRecords.length === 0) return;

    // --- STEP 1: Organize LAER records by Opportunity ---
    const oppIds = new Set();
    const laerByOpp = {};
    laerRecords.forEach(laer => {
        if (laer.Opportunity__c) oppIds.add(laer.Opportunity__c);
        if (!laerByOpp[laer.Opportunity__c]) laerByOpp[laer.Opportunity__c] = [];
        laerByOpp[laer.Opportunity__c].push(laer);
    });

    if (oppIds.size === 0) return;

    // --- STEP 2: Fetch Metadata Mappings ---
    const mappingRecords = await applink.query('LAER_Allocation_Field_Mapping__mdt', `
        SELECT Portolfio_Unit_Name__c, Allocation_Name__c, Sales_Id__c, 
               Sales_Id_Description__c, Commission_Field__c, Activated_By__c, Active__c
        FROM LAER_Allocation_Field_Mapping__mdt
        WHERE Active__c = true
    `);

    const mappingByPortfolio = {};
    const listSalesIds = [];
    mappingRecords.records.forEach(meta => {
        if (!mappingByPortfolio[meta.Portolfio_Unit_Name__c]) mappingByPortfolio[meta.Portolfio_Unit_Name__c] = [];
        mappingByPortfolio[meta.Portolfio_Unit_Name__c].push(meta);
        listSalesIds.push(meta.Sales_Id__c);
    });

    // --- STEP 3: Fetch existing Allocations from Salesforce ---
    const existingAllocs = await applink.query('Allocations__c', `
        SELECT Id, Name, Sales_Agent_Id__c, Opportunity__c,
               Secondary_Compensation__c, Activated_By__c
			   FROM Allocations__c
        WHERE Opportunity__c IN (${[...oppIds].map(id => `'${id}'`).join(',')})
          AND Sales_Agent_Id__c IN (${listSalesIds.map(id => `'${id}'`).join(',')})
    `);

    // --- STEP 4: Map wrapper by Opportunity Id ---
    const mapOppIdwithLwrap = {};
    listLAERWrapperwithOpp.forEach(lw => {
        if (lw.OppId.startsWith('006')) mapOppIdwithLwrap[lw.OppId] = lw;
    });

    // --- STEP 5: Map existing allocations by OppId + SalesId ---
    const existingByOppAndSalesId = {};
    existingAllocs.records.forEach(alloc => {
        if (!alloc.Sales_Agent_Id__c) return;
        if (!existingByOppAndSalesId[alloc.Opportunity__c]) existingByOppAndSalesId[alloc.Opportunity__c] = {};
        existingByOppAndSalesId[alloc.Opportunity__c][alloc.Sales_Agent_Id__c] = alloc;
    });

    // --- STEP 6: Prepare DML lists ---
    const toUpsert = [];
    const toDelete = [];

    for (const oppId of Object.keys(laerByOpp)) {
        if (!oppId) continue;

        const relatedLAERs = laerByOpp[oppId];
        const existingForOpp = existingByOppAndSalesId[oppId] || {};
        const laerSalesIds = new Set();

        for (const laer of relatedLAERs) {
            const lw = mapOppIdwithLwrap[oppId];
            const listmeta = mappingByPortfolio[laer.Name];
            if (!listmeta || listmeta.length === 0) continue;

            for (const meta of listmeta) {
                if (!meta || !meta.Sales_Id__c) continue;
                const salesId = meta.Sales_Id__c;
                let allocation;

                if (existingForOpp[salesId]) {
                    allocation = existingForOpp[salesId];
                    allocation.Name = meta.Allocation_Name__c;
                    allocation.Activated_By__c = meta.Activated_By__c;
                } else {
                    allocation = {
                        Opportunity__c: oppId,
                        Name: meta.Allocation_Name__c,
                        Sales_Agent_Id__c: salesId,
                        Activated_By__c: meta.Activated_By__c
                    };
                }

                allocation.Secondary_Compensation__c = getSecCompfromWrap(lw, meta, laer);

                laerSalesIds.add(salesId);
                toUpsert.push(allocation);
            }
        }

        // --- Identify allocations to delete ---
        for (const existingSalesId of Object.keys(existingForOpp)) {
            if (!laerSalesIds.has(existingSalesId)) {
                toDelete.push(existingForOpp[existingSalesId]);
            }
        }
    }

    console.log('Upsert allocations:', toUpsert);
    console.log('Delete allocations:', toDelete);

    // --- STEP 7: Bulk DML via AppLink ---
    //if (toUpsert.length > 0) await applink.upsert('Allocations__c', toUpsert, 'Id');
    //if (toDelete.length > 0) await applink.delete('Allocations__c', toDelete.map(a => a.Id));
}

module.exports = { syncAllocationsFromLAER };