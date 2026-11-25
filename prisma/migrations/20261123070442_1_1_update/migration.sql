-- AlterTable
ALTER TABLE "post" ALTER COLUMN "updated" DROP NOT NULL,
ALTER COLUMN "updated" DROP DEFAULT;
ALTER TABLE "user_settings" ADD COLUMN     "push" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN     "sysTheme" BOOLEAN NOT NULL DEFAULT true;
