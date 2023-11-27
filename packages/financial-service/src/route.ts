import { NextFunction, Request, Response, Router } from "express";
import controller from "./controller";
import express from "express";
import multer from "multer";
import { validateSchema } from "./middlewares/validate_schema";
import { authentication } from "./middlewares/authentication";

const uploadsDirectory = process.env.UPLOAD_DIRECTORY ?? "./uploads";
const upload = multer({ dest: uploadsDirectory });

const router: Router = express.Router();

function setBodyFieldAsMulterFilePath(field: string): any {
    return (req: Request, _: Response, next: NextFunction) => {
        req.body[field] = req.file?.path;
        next();
    };
}

/**
 * @openapi
 * /balance/{user_id}:
 *   get:
 *     security:
 *       - keycloak: []
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
 *                 treasury:
 *                   type: integer
 *                   format: int53
 *                 pending_balance:
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
    authentication,
    validateSchema({
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
 *     security:
 *       - keycloak: []
 *     tags:
 *       - transference
 *     summary: Place a deposit / creates a credit transference
 *     description: Create a credit transference from sender to recipient. It must be reviewed
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
 *             required:
 *               - amount
 *               - receipt
 *               - recipient_id
 *             properties:
 *               amount:
 *                 type: integer
 *                 format: int53
 *               receipt:
 *                 type: string
 *                 format: binary
 *               recipient_id:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Returns the newly placed deposit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewedTransferenceDTO'
 *       400:
 *         description: Some validation failed, check the response body
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthenticatedError'
 *       403:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
    "/balance/:recipient_id",
    upload.single("receipt"),
    setBodyFieldAsMulterFilePath("receipt"),
    validateSchema({
        sender_id: {
            isUUID: true,
            in: "params",
            errorMessage: "user_id must be a valid UUID",
        },
        recipient_id: {
            isUUID: true,
            in: "body",
            errorMessage: "recipient_id must be a valid UUID",
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
            in: "body",
            exists: true,
            errorMessage: "receipt file is required",
        },
        description: {
            in: "body",
            optional: true,
            isString: true,
        },
    }),
    controller.postUserDeposit,
);

/**
 * @openapi
 * /purchase:
 *   get:
 *     tags:
 *       - history
 *     summary: Gets the list of verified purchases
 *     description: Gets the list of verified purchases
 *     operationId: getVerifiedPurchases
 *     parameters:
 *       - name: pageNumber
 *         in: query
 *         required: false
 *         description: page index
 *         schema:
 *           type: integer
 *           format: int53
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         required: false
 *         description: elements per page
 *         schema:
 *           type: integer
 *           format: int53
 *           default: 50
 *       - name: orderDateBy
 *         in: query
 *         required: false
 *         description: if the elements should be ordered ascending or descending by the date
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: desc
 *     responses:
 *       200:
 *         description: description
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 anyOf:
 *                   - $ref: '#/components/schemas/TransferenceDTO'
 *                   - $ref: '#/components/schemas/ReviewedTransferenceDTO'
 */
router.get(
    "/purchase",
    validateSchema({
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
        orderDateBy: {
            optional: true,
            in: "query",
            default: { options: "desc" },
            isIn: { options: [["asc", "desc"]] },
            errorMessage: "orderBy must be etiher asc or desc",
        },
    }),
    controller.getVerifiedPurchases,
);

/**
 * @openapi
 * /purchase:
 *   post:
 *     tags:
 *       - transference
 *     summary: Post a purchase
 *     description: Post a purchase
 *     operationId: postUserPurchase
 *     requestBody:
 *       description: description
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - sender_id
 *               - amount
 *               - receipt
 *             properties:
 *               sender_id:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: integer
 *                 format: int53
 *               receipt:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: The posted purchase
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewedTransferenceDTO'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post(
    "/purchase",
    upload.single("receipt"),
    validateSchema({
        sender_id: {
            isUUID: true,
            in: "body",
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
            in: "body",
            exists: true,
            errorMessage: "receipt file is required",
        },
        description: {
            in: "body",
            optional: true,
            isString: true,
        },
    }),
    controller.postUserPurchase,
);


/**
 * @openapi
 * /history/{user_id}:
 *   get:
 *     tags:
 *       - history
 *     summary: Gets the user transference history
 *     description: Gets the user transference history 
 *     operationId: getUserTransferenceHistory
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: pageNumber
 *         in: query
 *         required: false
 *         description: page index
 *         schema:
 *           type: integer
 *           format: int53
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         required: false
 *         description: elements per page
 *         schema:
 *           type: integer
 *           format: int53
 *           default: 50
 *       - name: orderDateBy
 *         in: query
 *         required: false
 *         description: if the elements should be ordered ascending or descending by the date
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: desc
 *     responses:
 *       200:
 *         description: description
 *         content:
 *           application/json:
 *             schema:
 *               anyOf:
 *                 - $ref: '#/components/schemas/TransferenceDTO'
 *                 - $ref: '#/components/schemas/ReviewedTransferenceDTO'
 */
router.get(
    "/history/:user_id",
    validateSchema({
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
        orderDateBy: {
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
 * /transference/{transference_id}:
 *   get:
 *     tags:
 *       - history
 *     summary: Gets a transference
 *     description: Gets a transference
 *     operationId: getTransference
 *     parameters:
 *       - name: transference_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The transference (or reviewed transference)
 *         content:
 *           application/json:
 *             schema:
 *               anyOf:
 *                 - $ref: '#/components/schemas/TransferenceDTO'
 *                 - $ref: '#/components/schemas/ReviewedTransferenceDTO'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'               
 *       404:
 *         description: Transference not found
 *         content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ErrorResponse'
 *                
 */
router.get(
    "/transference/:transference_id",
    validateSchema({
        transference_id: {
            isUUID: true,
            in: "params",
            errorMessage: "transference_id must be a valid UUID",
        },
    }),
    controller.getTransference,
);

/**
 * @openapi
 * /verify:
 *   get:
 *     tags:
 *       - history
 *       - review
 *     summary: Gets the list of transferences not yet verified
 *     description: Gets the list of transferences not yet verified
 *     operationId: getPendingTransferences
 *     parameters:
 *       - name: pageNumber
 *         in: query
 *         required: false
 *         description: page index
 *         schema:
 *           type: integer
 *           format: int53
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         required: false
 *         description: elements per page
 *         schema:
 *           type: integer
 *           format: int53
 *           default: 50
 *       - name: orderDateBy
 *         in: query
 *         required: false
 *         description: if the elements should be ordered ascending or descending by the date
 *         schema:
 *           type: string
 *           enum:
 *             - asc
 *             - desc
 *           default: desc
 *     responses:
 *       200:
 *         description: The list of pending transferences
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReviewedTransferenceDTO'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'    
 */
router.get(
    "/verify",
    validateSchema({
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
        orderDateBy: {
            optional: true,
            in: "query",
            default: { options: "desc" },
            isIn: { options: [["asc", "desc"]] },
            errorMessage: "orderBy must be etiher asc or desc",
        },
    }),
    controller.getPendingTransferences,
);

/**
 * @openapi
 * /verify/{transference_id}:
 *   get:
 *     tags:
 *       - review
 *     summary: Gets a transference not yet verified
 *     description: Gets the transference with specified id if it has not been verified yet
 *     operationId: getUnverifiedTransference
 *     parameters:
 *       - name: transference_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transference not yet verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewedTransferenceDTO'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'               
 *       404:
 *         description: Transference not found
 *         content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    "/verify/:transference_id",
    validateSchema({
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
 *     summary: Verify a pending transference
 *     description: Verify a pending transference (ACCEPT or REJECT). You must provide the amount saw on the receipt. You can't verify your own transference
 *     parameters:
 *       - name: transference_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     operationId: postTransferenceVerification
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - action
 *               - reviewer_id
 *             properties:
 *               amount:
 *                 type: integer
 *                 format: int53
 *               action:
 *                 type: string
 *                 enum:
 *                   - ACCEPT
 *                   - REJECT
 *               reviewer_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: The transference reviewed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewedTransferenceDTO'
 *       400:
 *         description: Validation error or can't perform the operation
 *         content:
 *           application/json:
 *             schema:
 *               anyOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Transference already has been verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pending transference not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    "/verify/:transference_id",
    validateSchema({
        transference_id: {
            isUUID: true,
            in: "params",
            errorMessage: "transference_id must be a valid UUID",
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

/**
 * @openapi
 * /debit/{user_id}:
 *   post:
 *     tags:
 *       - transference
 *     summary: Post a debit for the user account
 *     description: Post a debit transference for the user account
 *     operationId: postDebit
 *     parameters:
 *       - name: user_id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 format: int53
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Debit transference successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferenceDTO'
 *       400:
 *         description: Validation error or error response
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    "/debit/:user_id",
    validateSchema({
        user_id: {
            isUUID: true,
            in: "params",
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
        description: {
            in: "body",
            optional: true,
            isString: true,
        },
    }),
    controller.postDebit,
);

export { router };
