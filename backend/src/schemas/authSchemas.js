const registerSchema = {
type: "object",
properties: {
name: {
type: "string",
minLength: 1,
maxLength: 100,
pattern: ".*\\S.*",
},
email: {
type: "string",
format: "email",
maxLength: 255,
},
password: {
type: "string",
minLength: 8,
maxLength: 72,
},
organizationMode: {
type: "string",
enum: ["create", "join"],
},
organizationName: {
type: "string",
minLength: 2,
maxLength: 150,
pattern: ".*\\S.*",
},
organizationId: {
type: "string",
format: "uuid",
},
},
required: [
"name",
"email",
"password",
"organizationMode",
],
allOf: [
{
if: {
properties: {
organizationMode: { const: "create" },
},
required: ["organizationMode"],
},
then: {
required: ["organizationName"],
not: {
required: ["organizationId"],
},
},
},
{
if: {
properties: {
organizationMode: { const: "join" },
},
required: ["organizationMode"],
},
then: {
required: ["organizationId"],
not: {
required: ["organizationName"],
},
},
},
],
additionalProperties: false,
};

const loginSchema = {
type: "object",
properties: {
email: {
type: "string",
format: "email",
maxLength: 255,
},
password: {
type: "string",
minLength: 1,
maxLength: 128,
},
},
required: ["email", "password"],
additionalProperties: false,
};

module.exports = {
registerSchema,
loginSchema,
};
