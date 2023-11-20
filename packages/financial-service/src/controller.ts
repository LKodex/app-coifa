import { PrismaClient, Review, Transference, TransferenceStatus } from "@prisma/client";
import { Request, Response } from "express";
import { Context } from "./context";
import service from "./service";

type TransferenceDTO = Transference;

type ReviewedTransferenceDTO = Omit<TransferenceDTO, "amount"> & Omit<Review, "transference_id"> & {
    amount?: number | null,
}

const context: Context = { prisma: new PrismaClient() };

async function getUserBalance(req: Request, res: Response) {
    const { user_id } = req.data;
    const userBalance = await service.getUserBalance(context, user_id);
    res.status(200).json(userBalance);
}

async function postUserDeposit(req: Request, res: Response) {
    const { sender_id, recipient_id, amount, receipt, description } = req.data;
    const isSenderRecipient = sender_id == recipient_id;
    if(isSenderRecipient) {
        return res.status(400).json({
            error: "you can't send a deposit to yourself. Did you mean to post a /purchase?",
        });
    }
    const placedDeposit = await service.postPendingTransference(
        context,
        amount,
        sender_id,
        receipt,
        recipient_id,
        description,
        "CREDIT",
    );
    
    const depositDto: ReviewedTransferenceDTO = {
        id: placedDeposit.id,
        sender_id: placedDeposit.sender_id,
        recipient_id: placedDeposit.recipient_id,
        amount: placedDeposit.amount,
        date: placedDeposit.date,
        kind: placedDeposit.kind,
        description: placedDeposit.description,
        receipt: placedDeposit.review!.receipt,
        reviewer_id: placedDeposit.review!.reviewer_id,
        reviewed_date: placedDeposit.review!.reviewed_date,
        status: placedDeposit.review!.status,
    };
    
    res.status(201).json(depositDto);
}

async function getVerifiedPurchases(req: Request, res: Response) {
    const { pageNumber, pageSize, orderDateBy: queryOrderBy } = req.data;
    // Gets only one argument if there's multiple on the query
    const orderDateBy = Array.isArray(queryOrderBy) ? queryOrderBy.shift() : queryOrderBy;
    const resultDto = await service.getPurchaseHistory(
        context,
        pageNumber ?? undefined,
        pageSize ?? undefined,
        orderDateBy ?? undefined,
    )
        .then((purchaseHistory) => {
            return purchaseHistory.map((transference) => {
                const { id, sender_id, recipient_id, amount, date, kind, description } = transference;
                const transferenceDto: TransferenceDTO = {
                    id,
                    sender_id,
                    recipient_id,
                    amount,
                    date,
                    kind,
                    description,
                };
                const isReviewedTransference = transference.review != null;
                if (isReviewedTransference) {
                    const { receipt, reviewed_date, reviewer_id, status } = transference.review!;
                    const reviewedDto: ReviewedTransferenceDTO = {
                        ...transferenceDto,
                        receipt,
                        reviewed_date,
                        reviewer_id,
                        status,
                    };
                    return reviewedDto;
                }
                return transferenceDto;
            });
        });
    res.status(200).json(resultDto);
}

async function postUserPurchase(req: Request, res: Response) {
    const { sender_id, amount, receipt, description } = req.data;
    const placedDeposit = await service.postPendingTransference(
        context,
        amount,
        sender_id,
        receipt,
        null,
        description,
        "PURCHASE",
    );
    
    const purchaseDto: ReviewedTransferenceDTO = {
        id: placedDeposit.id,
        sender_id: placedDeposit.sender_id,
        recipient_id: placedDeposit.recipient_id,
        amount: placedDeposit.amount,
        date: placedDeposit.date,
        kind: placedDeposit.kind,
        description: placedDeposit.description,
        receipt: placedDeposit.review!.receipt,
        reviewer_id: placedDeposit.review!.reviewer_id,
        reviewed_date: placedDeposit.review!.reviewed_date,
        status: placedDeposit.review!.status,
    };
    
    res.status(201).json(purchaseDto);
}

async function getUserTransferenceHistory(req: Request, res: Response) {
    const { user_id, pageNumber, pageSize, orderDateBy: queryOrderBy } = req.data;
    // Gets only one argument if there's multiple on the query
    const orderDateBy = Array.isArray(queryOrderBy) ? queryOrderBy.shift() : queryOrderBy;
    const resultDto = await service.getUserHistory(
        context,
        user_id,
        pageNumber,
        pageSize,
        orderDateBy,
    )
        .then((userHistory) => {
            return userHistory.map((transference) => {
                const { id, sender_id, recipient_id, amount, date, kind, description } = transference;
                const transferenceDto: TransferenceDTO = {
                    id,
                    sender_id,
                    recipient_id,
                    amount,
                    date,
                    kind,
                    description,
                };
                const isReviewedTransference = transference.review != null;
                if (isReviewedTransference) {
                    const { receipt, reviewed_date, reviewer_id, status } = transference.review!;
                    const reviewedDto: ReviewedTransferenceDTO = {
                        ...transferenceDto,
                        receipt,
                        reviewed_date,
                        reviewer_id,
                        status,
                    };
                    return reviewedDto;
                }
                return transferenceDto;
            });
        });
    res.status(200).json(resultDto);
}

async function getTransference(req: Request, res: Response) {
    const { transference_id } = req.data;
    const transference = await service.getTransference(context, transference_id);
    const isTransferenceExistent = Boolean(transference);
    if (!isTransferenceExistent) {
        return res.status(404).json({
            error: `Doesn't exists any transference with the id: ${transference_id}`,
        });
    }
    const { id, sender_id, recipient_id, amount, date, kind, description } = transference!;
    const transferenceDto: TransferenceDTO = {
        id,
        sender_id,
        recipient_id,
        amount,
        date,
        kind,
        description,
    };
    const isReviewedTransference = Boolean(transference!.review);
    if (isReviewedTransference) {
        const { receipt, reviewed_date, reviewer_id, status } = transference!.review!;
        const reviewedDto: ReviewedTransferenceDTO = {
            ...transferenceDto,
            receipt,
            reviewed_date,
            reviewer_id,
            status,
        };
        return res.status(200).json(reviewedDto);
    }
    return res.status(200).json(transferenceDto);
}

async function getPendingTransferences(req: Request, res: Response) {
    const { pageNumber, pageSize, orderDateBy: queryOrderBy } = req.data;
    // Gets only one argument if there's multiple on the query
    const orderDateBy = Array.isArray(queryOrderBy) ? queryOrderBy.shift() : queryOrderBy;
    const resultDto = await service.getTransferencesWithStatus(
        context,
        "PENDING",
        pageNumber ?? undefined,
        pageSize ?? undefined,
        orderDateBy ?? undefined,
    )
        .then((pendingTransferences) => {
            return pendingTransferences.map((transference) => {
                const { id, sender_id, recipient_id, amount, date, kind, description } = transference;
                const { receipt, reviewed_date, reviewer_id, status } = transference.review!;
                const transferenceDto: ReviewedTransferenceDTO = {
                    id,
                    sender_id,
                    recipient_id,
                    amount,
                    date,
                    kind,
                    description,
                    receipt,
                    reviewed_date,
                    reviewer_id,
                    status,
                };
                return transferenceDto;
            });
        });
    res.status(200).json(resultDto);
}

async function getUnverifiedTransference(req: Request, res: Response) {
    const { transference_id } = req.data;
    const unverifiedTransferece = await service.getTransference(context, transference_id);
    const isUnverifiedTransferenceExistent = Boolean(unverifiedTransferece) && unverifiedTransferece?.review?.status == "PENDING";
    if (isUnverifiedTransferenceExistent) {
        const { id, sender_id, recipient_id, amount, date, kind, description } = unverifiedTransferece;
        const { receipt, reviewed_date, reviewer_id, status } = unverifiedTransferece.review!;
        const transferenceDto: ReviewedTransferenceDTO = {
            id,
            sender_id,
            recipient_id,
            amount,
            date,
            kind,
            description,
            receipt,
            reviewed_date,
            reviewer_id,
            status,
        };
        return res.status(200).json(transferenceDto);
    }
    res.status(404).json({
        error: `Doesn't exists any pending transference with the id: ${transference_id}`,
    });
}

async function postTransferenceVerification(req: Request, res: Response) {
    // Verify if the transference exists
    const { transference_id, action, amount, reviewer_id } = req.data;
    const transference = await service.getTransference(context, transference_id);
    const isTransferenceExistent = Boolean(transference);
    if (!isTransferenceExistent) {
        return res.status(404).json({
            error: `Doesn't exists any transference with de id: ${transference_id}`,
        });
    }
    // Verify if the transference is pending
    const isTransferenceStatusPending = transference!.review!.status == TransferenceStatus.PENDING;
    if (!isTransferenceStatusPending) {
        return res.status(403).json({
            error: "This transferece already was verified",
        });
    }
    const isReviewerTheSender = transference?.sender_id == reviewer_id;
    if (isReviewerTheSender) {
        return res.status(400).json({
            error: "You can't verify a transference that you made",
        });
    }
    const isTransferenceReviewed = transference!.review!.status != "PENDING";
    if (isTransferenceReviewed) {
        return res.status(400).json({
            error: "The transference have already been verified",
        });
    }
    const isTransferenceAmountCorrespondent = amount == transference!.amount;
    if (!isTransferenceAmountCorrespondent) {
        return res.status(400).json({
            error: "The amount reviewed doesn't correspond to the amount declared",
        });
    }

    const reviewedTransference = await service.postTransferenceReview(
        context,
        amount,
        action,
        transference_id,
        reviewer_id,
    );

    const isReviewSuccessful = Boolean(reviewedTransference);
    if (!isReviewSuccessful) {
        return res.status(400).json({
            error: "The transference may have already been verified",
        });
    }

    const { id, sender_id, recipient_id, date, kind, description } = reviewedTransference!;
    const { receipt, reviewed_date, status } = reviewedTransference!.review!;
    const transferenceDto: ReviewedTransferenceDTO = {
        id,
        sender_id,
        recipient_id,
        amount,
        date,
        kind,
        description,
        receipt,
        reviewed_date,
        reviewer_id,
        status,
    };
    return res.status(200).json(transferenceDto);
}

// The debit transaction isn't an atomic database
// transaction and may cause a data inconsitency
// allowing users to have negative balance
async function postDebit(req: Request, res: Response) {
    const { user_id, amount, description: desc } = req.data;
    const userBalance = await service.getUserBalance(context, user_id);
    // GTE = Greater Than or Equal
    const isUserBalanceGTEAmount = userBalance.balance >= amount;
    if (!isUserBalanceGTEAmount) {
        return res.status(400).json({
            error: "The user balance is insufficient to complete this debit",
        });
    }

    const debit = await service.postTransference(
        context,
        amount,
        user_id,
        desc ?? undefined,
    );

    const { id, sender_id, recipient_id, date, kind, description } = debit;
    const debitDto: TransferenceDTO = {
        id,
        sender_id,
        recipient_id,
        amount,
        date,
        kind,
        description,
    }
    res.status(201).json(debitDto);
}

export = {
    getUserBalance,
    postUserDeposit,
    getVerifiedPurchases,
    postUserPurchase,
    getUserTransferenceHistory,
    getTransference,
    getPendingTransferences,
    getUnverifiedTransference,
    postTransferenceVerification,
    postDebit
};
