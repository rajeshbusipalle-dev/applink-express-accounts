/**
 * index.js
 * Express entry point for Salesforce → Heroku AppLink
 */
const PORT = process.env.APP_PORT || 3000
const express = require('express');
const applink = require('@heroku/applink');
const { calculateLAERTotalfields } = require('./laerFutureController');
const app = express();

/**
 * IMPORTANT:
 * Salesforce External Services send JSON
 * Body must be parsed BEFORE AppLink middleware
 */
app.use(express.json());

/**
 * AppLink middleware
 * This attaches applinkContext to the request
 */
app.use(applink.middleware());


app.get('/accounts', async (request, res) => {
    console.log('@@@',request.body);
    console.log('@@@',request.headers);
    
    request.sdk = applink.init();
    console.log('@@@',request.sdk);
    
    const queryString = "SELECT Id, Name FROM Account LIMIT 10";

    const sf = applink.parseRequest(request.headers, request.body, null);//.context.org.dataApi;
    console.log('@@@sf',sf);
    const org = sf.context.org;
    console.log('@@@org',org);
    

    const queryResult = await org.dataApi.query(queryString); //sf.query(queryString);
    const outAccounts = queryResult.records.map(rec => rec.fields);
    console.log('@@@outAccounts: ',request.headers);
    res.json(outAccounts);
})


/**
 * POST endpoint exposed to Salesforce External Services
 */
app.post('/calculateLAERTotalfields', async (req, res) => {
    try {
        const sf = applink.parseRequest(
                    req.headers,
                    req.body,
                    null
                    );

        const applinkContext = sf.context;

        if (!applinkContext) {
            return res.status(400).json({
                success: false,
                message: 'Missing AppLink context'
            });
        }

        const {
            recId,
            closeDate,
            sobjectType,
            dealId
        } = req.body;

        const result = await calculateLAERTotalfields({
            applinkContext,
            recId,
            closeDate,
            sobjectType,
            dealId
        });

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('ERROR calculateLAERTotalfields:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
});

/**
 * Health check (optional but recommended)
 */
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

/**
 * Heroku dyno port binding
 */

app.listen(PORT, () => {
    console.log(`AppLink Express server running on port ${PORT}`);
});
