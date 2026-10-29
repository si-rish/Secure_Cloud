const { XMLBuilder } = require("fast-xml-parser");
const sendError = require("./errorResponse");

const xmlBuilder = new XMLBuilder({
ignoreAttributes: false,
format: true,
suppressEmptyNode: true,
});

function sendNegotiatedResponse(req, res, statusCode, body) {
res.vary("Accept");

const acceptedType = req.accepts([
"application/json",
"application/xml",
]);

if (!acceptedType) {
return sendError(
res,
406,
"NOT_ACCEPTABLE",
"Supported response formats are JSON and XML"
);
}

if (acceptedType === "application/xml") {
return res
.status(statusCode)
.type("application/xml")
.send(xmlBuilder.build({ response: body }));
}

return res.status(statusCode).json(body);
}

module.exports = sendNegotiatedResponse;
