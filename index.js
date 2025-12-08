const express = require('express');
const bodyParser = require('body-parser');
const { syncAllocationsFromLAER } = require('./syncAllocations');
const { AppLink } = require('@heroku/applink-sdk');   // OAuth 3.0 AppLink SDK

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------
// Initialize AppLink (OAuth 3.0 Salesforce Auth)
// ---------------------------------------------
const applink = new AppLink({
    // These come from Heroku App Config Vars (auto provided by AppLink)
    clientId: process.env.APPLINK_CLIENT_ID,
    clientSecret: process.env.APPLINK_CLIENT_SECRET,
    applinkAppId: process.env.APPLINK_APP_ID
});

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// ------------------ Test route ------------------
app.get('/accounts', async (req, res) => {
    const sf = applinkSDK.parseRequest(req.headers, req.body, null).context.org.dataApi;

    const queryString = "SELECT Id, Name,Business_Type__c,Type FROM Account LIMIT 10";

    const queryResult = await sf.query(queryString);
    const outAccounts = queryResult.records.map(rec => rec.fields);

    res.json(outAccounts);
})


// ----------------------------------------------------------
// Middleware: Automatically get Salesforce Access Token
// ----------------------------------------------------------
async function getSFConnection(req, res, next) {
    try {
        // Retrieves fresh token automatically (OAuth 3.0)
        req.sf = await applink.getSalesforceConnection();

        if (!req.sf) {
            return res.status(401).json({ error: "Unable to authenticate to Salesforce (OAuth)" });
        }

        next();
    } catch (err) {
        console.error("OAuth Error:", err);
        return res.status(500).json({ error: "OAuth authentication failed", details: err.message });
    }
}

/**
 * POST /sync-allocations
 * Body: { laerRecords: [], listLAERWrapperwithOpp: [] }
 */
app.post('/sync-allocations', getSFConnection, async (req, res) => {
    const { laerRecords, listLAERWrapperwithOpp } = req.body;

    if (!laerRecords || !listLAERWrapperwithOpp) {
        return res.status(400).json({ error: 'Missing laerRecords or listLAERWrapperwithOpp in request body' });
    }

    try {
        // Inject Salesforce OAuth connection for downstream usage
        await syncAllocationsFromLAER(
            laerRecords,
            listLAERWrapperwithOpp,
            req.sf      // <--- Use this inside your JS logic
        );

        res.json({ message: 'Allocations sync completed successfully (OAuth 3.0)' });
    } catch (err) {
        console.error('Error syncing allocations:', err);
        res.status(500).json({ error: err.message });
    }
});

// --------------------- Start Server ---------------------
app.listen(PORT, () => {
    console.log(`Server running with OAuth 3.0 on port ${PORT}`);
});