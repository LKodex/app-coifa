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
                name: "transference",
                description: "Post realized transferences",
            },
            {
                name: "history",
                description: "See transferences history",
            },
            {
                name: "review",
                description: "Verify and review placed transferences",
            },
        ],
        components: {
            securitySchemes: {
                keycloak: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            responses: {
                UnauthorizedError: {
                    description: "You aren't authorized to perform this action",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    unauthorized: {
                                        type: "string"
                                    }
                                }
                            }
                        }
                    }
                },
                UnauthenticatedError: {
                    description: "You aren't authenticated, please provide a valid bearer token",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    unauthenticated: {
                                        type: "string"
                                    }
                                }
                            }
                        }
                    }
                },
            },
            schemas: {
                TransferenceDTO: {
                    type: "object",
                    required: [
                        "id",
                        "sender_id",
                        "amount",
                        "date",
                        "kind",
                    ],
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                        },
                        sender_id: {
                            type: "string",
                            format: "uuid",
                        },
                        recipient_id: {
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
                        kind: {
                            type: "string",
                            enum: [ "CREDIT", "DEBIT", "PURCHASE" ],
                        },
                        description: {
                            type: "string",
                        },
                    },
                },
                ReviewDTO: {
                    type: "object",
                    required: [
                        "receipt",
                        "status",
                    ],
                    properties: {
                        receipt: {
                            type: "string",
                        },
                        reviewed_date: {
                            type: "string",
                            format: "date-time",
                        },
                        reviewer_id: {
                            type: "string",
                            format: "uuid",
                        },
                        status: {
                            type: "string",
                            enum: [
                                "ACCEPTED",
                                "PENDING",
                                "REJECTED",
                            ],
                        },
                    },
                },
                ReviewedTransferenceDTO: {
                    allOf: [
                        { $ref: "#/components/schemas/TransferenceDTO" },
                        { $ref: "#/components/schemas/ReviewDTO" },
                    ],
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
