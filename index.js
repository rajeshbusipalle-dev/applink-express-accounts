const PORT = process.env.APP_PORT || 3000
const applinkSDK = require('@heroku/applink');
const express = require('express')
const app = express()

app.use(express.json())

app.get('/accounts', async (req, res) => {
    const sf = getSalesforceConnection(req);

    const queryString = "SELECT Id, Name FROM Account LIMIT 10";

    const queryResult = await sf.query(queryString);
    const outAccounts = queryResult.records.map(rec => rec.fields);

    res.json(outAccounts);
})

app.listen(PORT, () => {
    console.log(`Listening on ${ PORT }`)
})


function getSalesforceConnection(request) {
    const applink = applinkSDK.init();
    const parsedRequest = applink.salesforce.parseRequest(
        request.headers,
        request.body,
        null
    );
    return parsedRequest.context.org.dataApi;
}