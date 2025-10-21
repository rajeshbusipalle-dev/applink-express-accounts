const PORT = process.env.APP_PORT || 3000
const jsforce = require('jsforce')
const express = require('express')
const app = express()

app.use(express.json())

app.get('/accounts', async (req, res) => {
    const context_header = req.header('x-client-context');
    const context = getContext(context_header);

    const sf = getSalesforceConnection(context);
    const query = "SELECT Id, Name FROM Account LIMIT 10";

    const queryResult = await sf.query(query);
    const records = queryResult.records;

    var outAccounts = [];
    records.forEach(r => {
        outAccounts.push({
            id: r.Id,
            name: r.Name
        });

    });

    res.json(outAccounts);
})

app.listen(PORT, () => {
    console.log(`Listening on ${ PORT }`)
})

function getContext(header) {
    const decodedHeader = Buffer.from(header, "base64").toString("utf8");
    const context = JSON.parse(decodedHeader);
    return context;
}

function getSalesforceConnection(context) {
    return new jsforce.Connection({
        instanceUrl: context.orgDomainUrl,
        accessToken: context.accessToken
    });
}