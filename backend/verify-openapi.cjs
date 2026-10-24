const fs = require("fs");
const YAML = require("yaml");

const d = YAML.parse(
  fs.readFileSync("src/docs/openapi.yaml", "utf8")
);

console.log("YAML valid:", !!d.openapi);
console.log(
  "Registration:",
  d.paths["/auth/register"].post.responses["201"]
    .content["application/json"].schema["$ref"]
);
console.log(
  "Login:",
  d.paths["/auth/login"].post.responses["200"]
    .content["application/json"].schema["$ref"]
);
console.log("Endpoint paths:", Object.keys(d.paths).length);
