import { PrismaClient, Transference, TransferenceStatus } from "@prisma/client";
import { Request, Response } from "express";
import { Context } from "./context";
import service from "./service";

enum CreditDebit {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT",
}
type TransferenceDTO = Transference & {
    type?: CreditDebit | null,
};

type DepositDTO = Omit<TransferenceDTO, "amount"> & {
    amount?: number | null,
    reviewer_id?: string | null,
    reviewed_date?: Date | null,
    receipt: string,
    status: TransferenceStatus,
}

const context: Context = { prisma: new PrismaClient() };

async function getUserBalance(req: Request, res: Response) {
    const { data } = req;
    const userBalance = await service.getUserBalance(context, data.userId);
    res.status(200).json(userBalance);
}

async function postUserDeposit(req: Request, res: Response) {
    const deposit = { ...req.data };
    const placedDeposit = await service.placeDeposit(context, deposit);
    const { id, user_id, amount, date } = placedDeposit.transference;
    const { reviewed_date, reviewer_id, receipt, status } = placedDeposit;
    const depositDto: DepositDTO = {
        id,
        user_id,
        amount,
        date,
        reviewed_date,
        reviewer_id,
        receipt,
        status,
    };
    res.status(201).json(depositDto);
}

async function getUserTransferenceHistory(req: Request, res: Response) {
    const { user_id, pageNumber, pageSize, orderBy: queryOrderBy } = req.data;
    // Gets only one argument if there's multiple on the query
    const orderBy = Array.isArray(queryOrderBy) ? queryOrderBy.shift() : queryOrderBy;
    const resultDto = await service.getHistory(
        context,
        user_id,
        pageNumber,
        pageSize,
        orderBy,
    )
        .then(history => {
            return history.map((transference) => {
                const { id, user_id, amount, date } = transference;
                const transferenceDto: TransferenceDTO = {
                    id,
                    user_id,
                    amount,
                    date,
                    type: CreditDebit.DEBIT,
                };
                const isCreditTransference = transference.credit != null;
                if (isCreditTransference) {
                    const { reviewed_date, reviewer_id, receipt, status } = transference.credit!;
                    const depositDto: DepositDTO = {
                        ...transferenceDto,
                        reviewed_date,
                        reviewer_id,
                        receipt,
                        status,
                        type: CreditDebit.CREDIT,
                    };
                    return depositDto;
                }
                return transferenceDto;
            });
        });
    return res.status(200).json(resultDto);
}

async function getUserSpecificTransference(req: Request, res: Response) {
    const { transference_id, user_id } = req.data;
    const transference = await service.getTransferenceFromUser(context, transference_id, user_id);
    const isTransferenceExistent = Boolean(transference);
    if (!isTransferenceExistent) {
        return res.status(404).json({
            error: `Doesn't exists any transference with the id: ${transference_id}`,
        });
    }
    const { id, amount, date } = transference!;
    const transferenceDto: TransferenceDTO = {
        id,
        user_id,
        amount,
        date,
        type: CreditDebit.DEBIT,
    };
    const isCreditTransference = transference!.credit != null;
    if (isCreditTransference) {
        const { reviewed_date, reviewer_id, receipt, status } = transference!.credit!;
        const depositDto: DepositDTO = {
            ...transferenceDto,
            reviewed_date,
            reviewer_id,
            receipt,
            status,
            type: CreditDebit.CREDIT,
        };
        return res.status(200).json(depositDto);
    }
    return res.status(200).json(transferenceDto);
}

async function getUnverifiedTransference(req: Request, res: Response) {
    const { transference_id } = req.data;
    const deposit = await service.getDeposit(context, transference_id);
    const isDepositExistent = Boolean(deposit);
    if (isDepositExistent) {
        const { id, user_id, date } = deposit!.transference;
        const { receipt, status } = deposit!;
        const depositDto: DepositDTO = {
            id,
            user_id,
            date,
            receipt,
            status,
        };
        res.status(200).json(depositDto);
        return;
    }
    res.status(404).json({
        error: `Doesn't exists any transference with the id: ${transference_id}`,
    });
}

async function postTransferenceVerification(req: Request, res: Response) {
    // Verify if the transference exists
    const { transference_id, action, amount, reviewer_id } = req.data;
    const review = { transference_id, action, amount, reviewer_id };
    const deposit = await service.getDeposit(context, transference_id);
    const isDepositExistent = Boolean(deposit);
    if (!isDepositExistent) {
        return res.status(404).json({
            error: `Doesn't exists any transference with de id: ${transference_id}`,
        });
    }
    // Verify if the transference is pending
    const isDepositStatusPending = deposit!.status == TransferenceStatus.PENDING;
    if (!isDepositStatusPending) {
        return res.status(403).json({
            error: "This transferece already was verified",
        });
    }
    const isReviewerTheTransferenceUser = deposit!.transference.user_id == reviewer_id;
    if (isReviewerTheTransferenceUser) {
        return res.status(400).json({
            error: "You can't verify a deposit that you made",
        });
    }
    const reviewedDeposit = await service.reviewDeposit(context, review);
    const isDepositReviewed = Boolean(reviewedDeposit);
    if (!isDepositReviewed) {
        const messageIncorrespondentAmountReviewed = "The amount reviewed doesn't " + 
            "correspond to the amount declared";
        const messageTransferenceMaybeVerified = "The transference may have already " +
            "been verified";
        const isDepositAmountCorrespondent = amount == deposit!.transference.amount;
        const errorMessage = isDepositAmountCorrespondent
            ? messageTransferenceMaybeVerified
            : messageIncorrespondentAmountReviewed;
        return res.status(400).json({
            error: errorMessage,
        });
    }
    const { id, user_id, date } = reviewedDeposit!.transference;
    const { receipt, status, reviewed_date } = reviewedDeposit!;
    const depositDto: DepositDTO = {
        id,
        user_id,
        amount,
        date,
        reviewed_date,
        reviewer_id,
        receipt,
        status,
    };
    return res.status(200).json(depositDto);
}

export = {
    getUserBalance,
    postUserDeposit,
    getUserTransferenceHistory,
    getUserSpecificTransference,
    getUnverifiedTransference,
    postTransferenceVerification,
};
