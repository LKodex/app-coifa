import swaggerJSDoc, { OAS3Options } from "swagger-jsdoc";
import fs from "fs";
import path from "path";

const options: OAS3Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "App Coifa",
            version: "1.0.0",
        },
        tags: [
            {
                name: "balance",
                description: "See balance and place transfers",
            },
            {
                name: "history",
                description: "See transfer history",
            },
            {
                name: "review",
                description: "Verify placed transfers",
            },
        ],
        components: {
            schemas: {
                TransferenceDTO: {
                    type: "object",
                    required: [
                        "id",
                        "user_id",
                        "amount",
                        "date",
                    ],
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                        },
                        user_id: {
                            type: "string",
                            format: "uuid",
                        },
                        amount: {
                            type: "integer",
                            format: "int53",
                        },
                        date: {
                            type: "string",
                            format: "date-time",
                        },
                        type: {
                            type: "string",
                            enum: [ "CREDIT", "DEBIT" ],
                        },
                    },
                },
                DepositDTO: {
                    type: "object",
                    required: [
                        "id",
                        "user_id",
                        "date",
                        "receipt",
                        "status",
                    ],
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                        },
                        user_id: {
                            type: "string",
                            format: "uuid",
                        },
                        amount: {
                            type: "integer",
                            format: "int53",
                        },
                        date: {
                            type: "string",
                            format: "date-time",
                        },
                        reviewed_date: {
                            type: "string",
                            format: "date-time",
                        },
                        reviewer_id: {
                            type: "string",
                            format: "uuid",
                        },
                        receipt: {
                            type: "string",
                        },
                        status: {
                            type: "string",
                            enum: [
                                "ACCEPTED",
                                "PENDING",
                                "REJECTED",
                            ],
                        },
                        type: {
                            type: "string",
                            enum: [ "CREDIT", "DEBIT" ],
                        },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    required: [ "error" ],
                    properties: {
                        error: {
                            type: "string",
                            format: "text",
                        },
                    },
                },
                ValidationError: {
                    type: "array",
                    items: {
                        type: "object",
                        required: [ "msg" ],
                        properties: {
                            type: {
                                type: "string",
                            },
                            value: {
                                type: "string",
                            },
                            msg: {
                                type: "string",
                                format: "text",
                            },
                            path: {
                                type: "string",
                            },
                            location: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
    },
    apis: [
        "./src/route.ts",
    ],
};

const openapiSpecification = swaggerJSDoc(options);
const docsDirectory = path.resolve("./docs");
const specificationPath = path.resolve(docsDirectory, "openapi.json");
try {
    fs.mkdirSync(docsDirectory);
} catch(err) {
    console.log(`Directory ${docsDirectory} already exists`);
}
fs.writeFileSync(
    specificationPath,
    JSON.stringify(openapiSpecification),
);
console.log(`Saved OpenAPI specification at ${specificationPath}`);
