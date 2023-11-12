import { Application } from "express";
import bodyParser from "body-parser";
import express from "express";
import { router } from "./route";

const app: Application = express();
app.use("/uploads", express.static("uploads"));
app.use(bodyParser.json());
app.use(router);

export { app };
