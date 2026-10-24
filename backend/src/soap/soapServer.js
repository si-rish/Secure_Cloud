
const soap = require("soap");
const fs = require("fs");
const path = require("path");

const wsdlPath = path.join(__dirname, "securecloud.wsdl");

const service = {
  SecureCloudService: {
    SecureCloudPort: {
      HealthCheck(args, callback) {
        console.log("SOAP HealthCheck operation invoked");

        callback(null, {
          status: "OK",
          service: "SecureCloud",
        });
      },
    },
  },
};

function attachSoapServer(server) {
  const wsdl = fs.readFileSync(wsdlPath, "utf8");

  soap.listen(server, "/soap", service, wsdl);

  console.log("SOAP service attached at /soap");
}

module.exports = attachSoapServer;