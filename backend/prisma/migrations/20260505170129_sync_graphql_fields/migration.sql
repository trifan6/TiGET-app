/*
  Warnings:

  - You are about to drop the column `title` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `comment` on the `Review` table. All the data in the column will be lost.
  - Added the required column `name` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `author` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "title",
ADD COLUMN     "ageRestriction" TEXT,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "gallery" TEXT[],
ADD COLUMN     "lineup" TEXT[],
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" INTEGER,
ADD COLUMN     "sold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "thumbnail" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "date" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "comment",
ADD COLUMN     "author" TEXT NOT NULL,
ADD COLUMN     "text" TEXT NOT NULL;
