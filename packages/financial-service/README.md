# financial-service

##  Running the application for the first time  

1. Run `yarn install` to install the dependencies  

1. Configure your environment variables at `.env` file  

1. Run the migrations with `yarn run migrate`  

1. Run the following `yarn run start`  

1. Access `http://host:PORT/balance/e09e5959-c0ca-49b3-9276-c05212b9c618` when the message `"Listening on http://localhost:PORT/"` the server is up and running. Notice that it will crashes if the database URL is invalid

1. If the previous step returns you a JSON having properties `balance` and `pending` everything worked fine

## Environment Variables

These variables may be set at `.env` file and can be taken from the example file `.env.example`

Variable | Example | Default value
:-: | :-: | :-:
DATABASE_URL | "postgresql://user:password@host:port/dbname?schema=public" | -
PORT | 80 | 8080

## Generating Swagger Documentation

For an OpenAPI 3.0 specification, run `yarn run docs`. It generates a JSON file at `docs/openapi.json` compatible with Swagger.
