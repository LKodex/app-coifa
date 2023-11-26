import { NextFunction, Request, Response } from "express";
import { Schema, checkSchema, matchedData, validationResult } from "express-validator";

export function validateSchema(schema: Schema) {
    return [
        ...checkSchema(schema),
        (req: Request, res: Response, next: NextFunction) => {
            const result = validationResult(req);
            if (result.isEmpty()) {
                req.data = matchedData(req);
                return next();
            }
            res.status(400).json(result.array());
        },
    ];
}