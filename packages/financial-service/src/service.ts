import { Review, Transference, TransferenceKind, TransferenceStatus } from "@prisma/client";
import { Context } from "./context";

interface IBalance {
    balance: number,
    treasury: number,
    pending_balance: number,
}

interface ITransferenceWithReview extends Transference {
    review: Review | null,
}

async function getUserBalance(context: Context, user_id: string): Promise<IBalance> {
    const result = await context.prisma.transference.findMany({
        where: {
            sender_id: user_id,
            OR: [{
                review: null,
            }, {
                review: {
                    NOT: [{
                        status: TransferenceStatus.REJECTED,
                    }],
                },
            }],
        },
        include: { review: true },
    });

    const balance = result.reduce((balance: IBalance, transference): any => {
        switch (transference.kind) {
        case TransferenceKind.PURCHASE: {
            const isPurchaseAccepted = transference.review?.status == TransferenceStatus.ACCEPTED;
            if (isPurchaseAccepted) {
                balance.treasury -= transference.amount;
            }
            break;
        }
        case TransferenceKind.DEBIT: 
            balance.balance -= transference.amount;
            break;
        case TransferenceKind.CREDIT: {
            const isCreditRejected = transference.review?.status == TransferenceStatus.REJECTED;
            if (isCreditRejected) {
                break;
            }
            const isCreditPending = transference.review?.status == TransferenceStatus.PENDING;
            if (isCreditPending) {
                balance.pending_balance += transference.amount;
                break;
            }
            const isSender = transference.sender_id == user_id;
            if (isSender) {
                balance.balance += transference.amount;
                break;
            }
            balance.treasury += transference.amount;
            break;
        }
        }
        return balance;
    },
    {
        balance: 0,
        treasury: 0,
        pending_balance: 0,
    });

    const treasurySurplus = Math.abs(Math.min(0, balance.treasury));
    return {
        balance: balance.balance + treasurySurplus,
        treasury: balance.treasury + treasurySurplus,
        pending_balance: balance.pending_balance,
    };
}

async function getPurchaseHistory(
    context: Context,
    pageNumber: number = 1,
    pageSize: number = 50,
    orderDateBy: "asc" | "desc" = "desc",
): Promise<ITransferenceWithReview[]> {
    return context.prisma.transference.findMany({
        take: pageSize,
        skip: pageSize * (pageNumber - 1),
        where: { kind: TransferenceKind.PURCHASE },
        include: { review: true },
        orderBy: {
            date: orderDateBy,
        },
    });
}

// Debit
async function postTransference(
    context: Context,
    amount: number,
    sender_id: string,
    description: string,
): Promise<Transference> {
    return context.prisma.transference.create({
        data: {
            amount,
            sender_id,
            description,
            kind: TransferenceKind.DEBIT,
        },
    });
}

// Credit / Purchase
async function postPendingTransference(
    context: Context,
    amount: number,
    sender_id: string,
    receipt: string,
    recipient_id: string | null = null,
    description: string | null = null,
    kind: TransferenceKind,
): Promise<ITransferenceWithReview> {
    return context.prisma.transference.create({
        data: {
            amount,
            sender_id,
            recipient_id,
            kind,
            description,
            review: {
                create: {
                    receipt,
                },
            },
        },
        include: {
            review: true,
        },
    });
}

async function getUserHistory(
    context: Context,
    user_id: string,
    pageNumber: number = 1,
    pageSize: number = 50,
    orderDateBy: "asc" | "desc" = "desc",
): Promise<ITransferenceWithReview[]> {
    return context.prisma.transference.findMany({
        take: pageSize,
        skip: pageSize * (pageNumber - 1),
        where: { sender_id: user_id },
        include: { review: true },
        orderBy: {
            date: orderDateBy,
        },
    });
}

async function getTransference(
    context: Context,
    id: string,
): Promise<ITransferenceWithReview | null> {
    return context.prisma.transference.findUnique({
        where: { id },
        include: { review: true },
    });
}

async function postTransferenceReview(
    context: Context,
    amount: number,
    action: string,
    transference_id: string,
    reviewer_id: string,
) /*: Promise<ITransferenceWithReview | null> */ {
    const status = action == "ACCEPT" ? TransferenceStatus.ACCEPTED : TransferenceStatus.REJECTED;
    return context.prisma.transference.update({
        where: {
            id: transference_id,
            amount: {
                equals: amount,
            },
            review: {
                status: TransferenceStatus.PENDING,
            },
        },
        data: {
            review: {
                update: {
                    where: {
                        transference_id,
                    },
                    data: {
                        reviewer_id,
                        status,
                    },
                },
            },
        },
        include: {
            review: true,
        },
    })
        .catch((_recordNotFound: any) => null);
}

async function getTransferencesWithStatus(
    context: Context,
    status: TransferenceStatus,
    pageNumber: number = 1,
    pageSize: number = 50,
    orderDateBy: "asc" | "desc" = "desc",
): Promise<ITransferenceWithReview[]> {
    return context.prisma.transference.findMany({
        take: pageSize,
        skip: pageSize * (pageNumber - 1),
        where: {
            review: {
                status,
            },
        },
        include: {
            review: true,
        },
        orderBy: {
            date: orderDateBy,
        },
    });
}

export = {
    getPurchaseHistory,
    getUserBalance,
    getUserHistory,
    getTransference,
    getTransferencesWithStatus,
    postPendingTransference,
    postTransference,
    postTransferenceReview,
};
