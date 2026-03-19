-- AlterTable
ALTER TABLE "users" ALTER COLUMN "slug" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "users_slug_idx" ON "users"("slug");
