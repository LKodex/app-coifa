import { NextFunction, Request, Response, Router } from "express";
import { Schema, checkSchema, matchedData, validationResult } from "express-validator";
import controller from "./controller";
import express from "express";
import multer from "multer";

const uploadsDirectory = process.env.UPLOAD_DIRECTORY ?? "./uploads";
const upload = multer({ dest: uploadsDirectory });

const router: Router = express.Router();

function setBodyFieldAsMulterFilePath(field: string): any {
    return (req: Request, res: Response, next: NextFunction) => {
        req.body[field] = req.file?.path;
        next();
    };
}

function validate (schema: Schema) {
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

/**
 * @openapi
 * /balance/{user_id}:
 *   get:
 *     tags:
 *       - balance
 *     summary: Gets user balance and pending values
 *     description: Gets the user balance and pending credit not yet reviewed.
 *       If the user never made a transference it returns 0 for balance and
 *       pending
 *     operationId: getUserBalance
 *     parameters:
 *       - name: user_id
 *         in: path
 *         description: UUID of the user to be fetched the balance
 *         required: true        
 *         schema:
 *           type: string
 *           format: uuid 
 *     responses:
 *       200:
 *         description: Returns the user balance and pending values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: integer
 *                   format: int53
 *                 pending:
 *                   type: integer
 *                   format: int53
 *       400:
 *         description: Invalid user_id, it must be a valid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.get(
    "/balance/:user_id",
    validate({
        user_id: {
            isUUID: true,
            in: "params",
            errorMessage: "user_id must be a valid UUID",
        },
    }),
    controller.getUserBalance,
);

/**
 * @openapi
 * /balance/{user_id}:
 *   post:
 *     tags:
 *       - balance
 *     summary: Place a deposit / creates a credit transference
 *     description: Create a credit transference for the user. It must be reviewed
 *       to be credited to the user
 *     operationId: postUserDeposit
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         description: UUID of the user to be placed the deposit
 *           transference request
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       description: Deposit information. Amount and receipt
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [ amount, receipt ]
 *             properties:
 *               amount:
 *                 type: integer
 *                 format: int53
 *               receipt:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Returns the newly placed deposit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositDTO'
 *       400:
 *         description: Either invalid user_id, not integer amount or receipt
 *           file not sent
 */
router.post(
    "/balance/:user_id",
    upload.single("receipt"),
    setBodyFieldAsMulterFilePath("receipt"),
    validate({
        user_id: {
            isUUID: true,
            in: "params",
            errorMessage: "user_id must be a valid UUID",
        },
        amount: {
            toInt: true,
            isInt: {
                options: {
                    min: 1,
                },
            },
            in: "body",
            errorMessage: "amount must be a positive integer number",
        },
        receipt: {
            exists: true,
            errorMessage: "receipt file is required",
        },
    }),
    controller.postUserDeposit,
);

/**
 * @openapi
 * /history/{user_id}:
 *   get:
 *     tags:
 *       - history
 *     summary: Get user transference history
 *     description: Returns the transference history. By default it returns the
 *       first page with the last 50 transferences.
 *     operationId: getUserTransferenceHistory
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         description: UUID of the user to be fetched the history
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: pageNumber
 *         in: query
 *         required: false
 *         description: The page number of history
 *         schema:
 *           type: integer
 *           format: int53
 *       - name: pageSize
 *         in: query
 *         required: false
 *         description: The total quantity of transferences per page
 *         schema:
 *           type: integer
 *           format: int8
 *           default: 50
 *       - name: orderBy
 *         in: query
 *         required: false
 *         description: If the history must be sorted by the most recent or most old
 *         schema:
 *           type: string
 *           enum: [ asc, desc ]
 *           default: desc
 *     responses:
 *       200:
 *         description: Returns the history of the specified user even if it's
 *           empty
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 anyOf:
 *                   - $ref: '#/components/schemas/TransferenceDTO'
 *                   - $ref: '#/components/schemas/DepositDTO'
 *       400:
 *         description: Either invalid user_id, pageSize, pageNumber or orderBy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.get(
    "/history/:user_id",
    validate({
        user_id: {
            isUUID: true,
            in: "params",
            errorMessage: "user_id must be a valid UUID",
        },
        pageNumber: {
            optional: true,
            in: "query",
            default: { options: 1 },
            isInt: {
                options: {
                    min: 1,
                },
            },
            toInt: true,
            errorMessage: "pageNumber must be a positive integer",
        },
        pageSize: {
            optional: true,
            in: "query",
            default: { options: 50 },
            isInt: {
                options: {
                    min: 1,
                    max: 255,
                },
            },
            toInt: true,
            errorMessage: "pageSize must be a positive 8 bits integer",
        },
        orderBy: {
            optional: true,
            in: "query",
            default: { options: "desc" },
            isIn: { options: [["asc", "desc"]] },
            errorMessage: "orderBy must be etiher asc or desc",
        },
    }),
    controller.getUserTransferenceHistory,
);

/**
 * @openapi
 * /history/{user_id}/transference/{transference_id}:
 *   get:
 *     tags:
 *       - history
 *     summary: Get a specific transference from history
 *     description: Checks if have permission to fetch from the specified user
 *       history and return the specified transference
 *     operationId: getUserSpecificTransferece
 *     parameters:
 *       - name: user_id
 *         in: path
 *         description: UUID of the user to be fetched the history
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: transference_id
 *         in: path
 *         description: UUID of the transference to be fetched from user history
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Returns the transference of specified transference_id
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/TransferenceDTO'
 *                 - $ref: '#/components/schemas/DepositDTO'
 *       400:
 *         description: Invalid transference_id, it must be a valid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: There's no transference with the specified transference_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    "/history/:user_id/transference/:transference_id",
    validate({
        user_id: {
            isUUID: true,
            in: "params",
            errorMessage: "user_id must be a valid UUID",
        },
        transference_id: {
            isUUID: true,
            in: "params",
            errorMessage: "transference_id must be a valid UUID",
        },
    }),
    controller.getUserSpecificTransference,
);

/**
 * @openapi
 * /verify/{transference_id}:
 *   get:
 *     tags:
 *       - review
 *     summary: Gets a transference not yet reviewed
 *     description: Gets a credit transference not yet reviewed. If the credit
 *       transference already was reviewed it's returned an error
 *     operationId: getUnverifiedTransference
 *     parameters:
 *       - name: transference_id
 *         in: path
 *         description: UUID of the credit transference 
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Returns the verified transference
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositDTO'
 *       400:
 *         description: Invalid transference_id, it must be a valid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       403:
 *         description: The credit transference already was verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: There's no transference with the specified transference_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    "/verify/:transference_id",
    validate({
        transference_id: {
            isUUID: true,
            in: "params",
            errorMessage: "transference_id must be a valid UUID",
        },
    }),
    controller.getUnverifiedTransference,
);

/**
 * @openapi
 * /verify/{transference_id}:
 *   post:
 *     tags:
 *       - review
 *     summary: Verify a placed deposit
 *     description: Verify a placed deposit by either accepting or rejecting
 *     operationId: postTransferenceVerification
 *     parameters:
 *       - name: transference_id
 *         in: path
 *         description: UUID of the credit transference
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       description: Required data to verify a deposit
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ACCEPT, REJECT]
 *               amount:
 *                 type: integer
 *                 format: int53
 *               reviewer_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Returns the verified transference
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositDTO'
 *       400:
 *         description: Either invalid transference_id, invalid action or invalid amount.
 *           Also the amount can be a distinct from the one declared or the transference
 *           may have already been verified
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: The user isn't allowed to see transferences that isn't
 *           pending
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: There's no transference with the specified transference_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    "/verify/:transference_id",
    validate({
        transference_id: {
            isUUID: true,
            in: "params",
            errorMessage: "transference_id must be a valid UUID",
        },
        amount: {
            isInt: true,
            toInt: true,
            in: "body",
            errorMessage: "amount must be a integer",
        },
        action: {
            isIn: { options: [["ACCEPT", "REJECT"]] },
            in: "body",
            errorMessage: "action must be either ACCEPT or REJECT",
        },
        reviewer_id: {
            isUUID: true,
            in: "body",
            errorMessage: "reviewer_id must be a valid UUID",
        },
    }),
    controller.postTransferenceVerification,
);

export { router };
