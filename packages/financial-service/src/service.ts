import { Credit, Transference, TransferenceStatus } from "@prisma/client";
import { Context } from "./context";
import { ReviewAction } from "./types";

interface IBalance {
    balance: number,
    pending: number,
}

async function getUserBalance(context: Context, id: string): Promise<IBalance> {
    const transferenceHistory = await context.prisma.transference.findMany({
        where: { id },
        include: { credit: true },
    });
    const balance = transferenceHistory.reduce((acc: IBalance, transference) => {
        const isCreditTransference = Boolean(transference.credit);
        if (!isCreditTransference) {
            acc.balance -= transference.amount;
            return acc;
        }
        const creditTransferenceStatus = transference.credit!.status;
        switch (creditTransferenceStatus) {
        case TransferenceStatus.PENDING:
            acc.pending += transference.amount;
            break;
        case TransferenceStatus.ACCEPTED:
            acc.balance += transference.amount;
        }
        return acc;
    },
    {
        balance: 0,
        pending: 0,
    });
    return balance;
}

interface IDeposit {
    amount: number,
    user_id: string,
    receipt: string,
}

async function placeDeposit(context: Context, deposit: IDeposit) {
    const { user_id, amount, receipt } = deposit;
    return context.prisma.credit.create({
        data: {
            receipt,
            transference: {
                create: {
                    user_id,
                    amount,
                },
            },
        },
        include: {
            transference: true,
        },
    });
}

interface IReview {
    transference_id: string,
    reviewer_id: string,
    amount: number,
    action: ReviewAction,
}

interface ICreditTransference extends Credit {
    transference: Transference,
}

async function reviewDeposit(context: Context, review: IReview): Promise<ICreditTransference | null> {
    const {
        transference_id,
        reviewer_id,
        action,
        amount,
    } = review;
    const status = action == "ACCEPT" ? TransferenceStatus.ACCEPTED : TransferenceStatus.REJECTED;
    return context.prisma.credit.update({
        where: {
            transference_id,
            status: TransferenceStatus.PENDING,
            transference: {
                amount: {
                    equals: amount,
                },
            },
        },
        data: {
            reviewer_id,
            status,
        },
        include: {
            transference: true,
        },
    })
        .catch((_recordNotFound) => null);
}

async function getDeposit(context: Context, transference_id: string): Promise<ICreditTransference | null> {
    return context.prisma.credit.findUnique({
        where: { transference_id },
        include: { transference: true },
    });
}

async function getTransference(context: Context, id: string): Promise<Transference | null> {
    return context.prisma.transference.findUnique({
        where: { id },
        include: { credit: true },
    });
}

interface ITransferenceWithCredit extends Transference {
    credit: Credit | null,
}

async function getTransferenceFromUser(
    context: Context,
    id: string,
    user_id: string,
): Promise<ITransferenceWithCredit | null> {
    return context.prisma.transference.findUnique({
        where: {
            id,
            user_id,
        },
        include: { credit: true },
    });
}

async function getHistory(
    context: Context,
    user_id: string,
    pageNumber: number = 1,
    pageSize: number = 50,
    orderBy: "asc" | "desc" = "desc",
): Promise<ITransferenceWithCredit[]> {
    return context.prisma.transference.findMany({
        take: pageSize,
        skip: pageSize * (pageNumber - 1),
        where: { user_id },
        include: { credit: true },
        orderBy: {
            date: orderBy,
        },
    });
}

export = {
    getUserBalance,
    placeDeposit,
    reviewDeposit,
    getDeposit,
    getTransference,
    getTransferenceFromUser,
    getHistory,
};
