-- CreateTable
CREATE TABLE "MarketingChannelState" (
    "channel" TEXT NOT NULL,
    "throttledUntil" TIMESTAMP(3),
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingChannelState_pkey" PRIMARY KEY ("channel")
);
