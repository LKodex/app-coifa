import { DeepMockProxy, mockDeep } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";

type Context = {
    prisma: PrismaClient
}

type MockContext = {
    prisma: DeepMockProxy<PrismaClient>
}

function createMockContext(): MockContext {
    return {
        prisma: mockDeep<PrismaClient>(),
    };
}

export {
    Context,
    MockContext,
    createMockContext,
};
