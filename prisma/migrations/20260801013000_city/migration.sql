-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "ibgeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_ibgeCode_key" ON "City"("ibgeCode");

-- CreateIndex
CREATE INDEX "City_state_name_idx" ON "City"("state", "name");
