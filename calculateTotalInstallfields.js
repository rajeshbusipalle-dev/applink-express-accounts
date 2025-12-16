function calculateTotalInstallfields(mappingForTotals, mapLaerTotalWithValue, oprod, currencyconversionvar, oppCloseDate) {

    // Helper: add or update key
    const putValue = (key, val) => {
        mapLaerTotalWithValue[key] = (mapLaerTotalWithValue[key] || 0) + val;
    };

    // === CR 022997 / ACV List Calculation ===
    let expiringACVList = 0;

    if (oprod.Include_Cancelled_LI_Exp_ACV__c && oprod.Quantity__c && oprod.Quantity__c !== 0) {
        expiringACVList =
            oprod.Original_TCV__c *
            (oprod.Cancelled_Quantity__c > 0
                ? (oprod.Cancelled_Quantity__c / oprod.Quantity__c)
                : 1);
    } else {
        let isSubLicense =
            oprod.subLicenseTypes &&
            oprod.subLicenseTypes.includes(oprod.License_Type__c);

        let isExtHardwareLicense =
            oprod.extHardwareLicenseTypes &&
            oprod.extHardwareLicenseTypes.includes(oprod.License_Type__c);

        expiringACVList =
            (
                isSubLicense && oprod.Monthly_List_License__c && oprod.Quantity__c
                    ? (oprod.Monthly_List_License__c * oprod.Quantity__c * 12)
                    : isExtHardwareLicense && oprod.Monthly_List_Maint__c && oprod.Quantity__c
                        ? (oprod.Monthly_List_Maint__c * oprod.Quantity__c * 12)
                        : 0
            ) * currencyconversionvar;
    }

    putValue("Expiring_ACV_List__c", expiringACVList);

    // === Top-level ACV groups ===
    const subscriptionTypes = ["Subscriptn", "Annual", "PLC/ALC"];
    const perpetualTypes = ["Extended", "QA-Test", "Backup", "WAN Licens"];
    const hardwareTypes = ["Hardware"];

    // Total_Expiring_Subscription_ACV__c
    let amountExpiringSubscriptionACV =
        (
            oprod.Expiring_ACV__c &&
            subscriptionTypes.includes(oprod.License_Type__c) &&
            !["27", "SaaS", "HSaaS", "LaaS", "LS Other"].includes(oprod.License_Model__c)
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_Subscription_ACV__c", amountExpiringSubscriptionACV);

    // Total_Expiring_SaaS_ACV__c
    let amountExpiringSaaSACV =
        (
            oprod.Expiring_ACV__c &&
            (oprod.License_Model__c === "SaaS" || oprod.License_Model__c === "27")
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_SaaS_ACV__c", amountExpiringSaaSACV);

    // Total_Expiring_HSaaS_ACV__c
    let amountExpiringHSaaSACV =
        (
            oprod.Expiring_ACV__c &&
            (oprod.License_Type__c === "HSAS" || oprod.License_Type__c === "HSaaS")
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_HSaaS_ACV__c", amountExpiringHSaaSACV);

    // Total_Expiring_LaaS_ACV__c
    let amountExpiringLaaSACV =
        (
            oprod.Expiring_ACV__c &&
            oprod.License_Model__c === "LaaS"
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_LaaS_ACV__c", amountExpiringLaaSACV);

    // Total_Expiring_Maintenance_ACV__c
    let amountExpiringMaintenanceACV =
        (
            oprod.Total_Line_Maintenance__c &&
            perpetualTypes.includes(oprod.License_Type__c)
                ? oprod.Total_Line_Maintenance__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_Maintenance_ACV__c", amountExpiringMaintenanceACV);

    // Total_Expiring_Hardware_ACV__c
    let amountExpiringHardwareACV =
        (
            oprod.Total_Line_Maintenance__c &&
            hardwareTypes.includes(oprod.License_Type__c)
                ? oprod.Total_Line_Maintenance__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_Hardware_ACV__c", amountExpiringHardwareACV);

    // === TCV Logic ===
    let tcvValue = 0;

    if (oprod.Include_Cancelled_LI_Exp_ACV__c && oprod.Quantity__c && oprod.Quantity__c !== 0) {
        tcvValue =
            oprod.Original_TCV__c *
            (oprod.Cancelled_Quantity__c > 0
                ? (oprod.Cancelled_Quantity__c / oprod.Quantity__c)
                : 1);
    } else {
        tcvValue = oprod.Subscription_License_Net__c || 0;
    }

    // Subscription TCV
    let amountExpiringSubscriptionTCV =
        (
            tcvValue &&
            !oprod.IsCancelled__c &&
            subscriptionTypes.includes(oprod.License_Type__c) &&
            !["27", "SaaS", "HSaaS", "LaaS", "LS Other"].includes(oprod.License_Model__c)
                ? tcvValue
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_Subscription_TCV__c", amountExpiringSubscriptionTCV);

    // SaaS TCV
    let amountExpiringSaaSTCV =
        (
            tcvValue &&
            !oprod.IsCancelled__c &&
            (oprod.License_Model__c === "SaaS" || oprod.License_Model__c === "27")
                ? tcvValue
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_SaaS_TCV__c", amountExpiringSaaSTCV);

    // HSaaS TCV
    let amountExpiringHSaaSTCV =
        (
            tcvValue &&
            !oprod.IsCancelled__c &&
            (oprod.License_Type__c === "HSAS" || oprod.License_Type__c === "HSaaS")
                ? tcvValue
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_HSaaS_TCV__c", amountExpiringHSaaSTCV);

    // LaaS TCV
    let amountExpiringLaaSTCV =
        (
            tcvValue &&
            !oprod.IsCancelled__c &&
            oprod.License_Model__c === "LaaS"
                ? tcvValue
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_LaaS_TCV__c", amountExpiringLaaSTCV);

    // Maintenance TCV
    let amountExpiringMaintenanceTCV =
        (
            oprod.Maintenance_TCV__c &&
            perpetualTypes.includes(oprod.License_Type__c)
                ? oprod.Maintenance_TCV__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_Maintenance_TCV__c", amountExpiringMaintenanceTCV);

    // Hardware TCV
    let amountExpiringHardwareTCV =
        (
            oprod.Maintenance_TCV__c &&
            hardwareTypes.includes(oprod.License_Type__c)
                ? oprod.Maintenance_TCV__c
                : 0
        ) * currencyconversionvar;

    putValue("Total_Expiring_Hardware_TCV__c", amountExpiringHardwareTCV);

    // === 12 Months Equivalent ===
    let amountExpiring12MthsEquivalent = 0;

    if (
        oprod.Order_Monthly_Net__c &&
        ["Subscriptn", "HSAS", "PLC/ALC", "Annual", "HTEST", "HLOAN", "HBKUP", "HTLO", "SBKUP", "STEST"]
            .includes(oprod.License_Type__c)
    ) {
        amountExpiring12MthsEquivalent = oprod.Order_Monthly_Net__c * 12;
    } else if (
        oprod.Total_Line_Maintenance__c &&
        ["Extended", "Backup", "QA-Test", "WAN Licens", "Hardware"].includes(oprod.License_Type__c)
    ) {
        amountExpiring12MthsEquivalent = oprod.Total_Line_Maintenance__c;
    }

    let converted12 = amountExpiring12MthsEquivalent * currencyconversionvar;

    putValue("Total_Expiring_12_Mths_Equivalent__c", converted12);

    // === Expiring Initial ACV ===
    if (oprod.expiringInitialEventACV != null) {
        mapLaerTotalWithValue["Expiring_Initial_Event_ACV__c"] =
            oprod.expiringInitialEventACV;
    }

    // === T2X Fields ===
    let t2xExpACVfromPerpetual =
        (
            oprod.Expiring_ACV__c &&
            oprod.Replaced_by_X_Solution__c &&
            perpetualTypes.concat(hardwareTypes).includes(oprod.License_Type__c)
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("T2X_Exp_ACV_from_Perpetual__c", t2xExpACVfromPerpetual);

    let t2xExpACVfromHSaaS =
        (
            oprod.Expiring_ACV__c &&
            oprod.Replaced_by_X_Solution__c &&
            oprod.License_Type__c === "HSAS"
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("T2X_Exp_ACV_from_HSaaS__c", t2xExpACVfromHSaaS);

    let t2xExpACVfromSubscription =
        (
            oprod.Expiring_ACV__c &&
            oprod.Replaced_by_X_Solution__c &&
            oprod.License_Type__c === "Subscriptn" &&
            oprod.License_Model__c !== "27"
                ? oprod.Expiring_ACV__c
                : 0
        ) * currencyconversionvar;

    putValue("T2X_Exp_ACV_from_Subscription__c", t2xExpACVfromSubscription);

    return mapLaerTotalWithValue;
}

module.exports = {
    calculateTotalInstallfields,
};
