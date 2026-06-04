/*
  Warnings:

  - You are about to drop the column `storageKey` on the `media` table. All the data in the column will be lost.
  - You are about to drop the `chat_direct_read_states` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_group_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_group_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_messages` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `storagePath` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('DIRECT', 'GROUP');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'POST_COMMENTED_FOLLOWED';

-- DropForeignKey
ALTER TABLE "chat_direct_read_states" DROP CONSTRAINT "chat_direct_read_states_peerUserId_fkey";

-- DropForeignKey
ALTER TABLE "chat_direct_read_states" DROP CONSTRAINT "chat_direct_read_states_userId_fkey";

-- DropForeignKey
ALTER TABLE "chat_group_members" DROP CONSTRAINT "chat_group_members_groupId_fkey";

-- DropForeignKey
ALTER TABLE "chat_group_members" DROP CONSTRAINT "chat_group_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "chat_group_messages" DROP CONSTRAINT "chat_group_messages_groupId_fkey";

-- DropForeignKey
ALTER TABLE "chat_group_messages" DROP CONSTRAINT "chat_group_messages_senderId_fkey";

-- DropForeignKey
ALTER TABLE "chat_groups" DROP CONSTRAINT "chat_groups_createdById_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_senderId_fkey";

-- AlterTable
ALTER TABLE "media" DROP COLUMN "storageKey",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "storagePath" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "post_likes" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'like';

-- DropTable
DROP TABLE "chat_direct_read_states";

-- DropTable
DROP TABLE "chat_group_members";

-- DropTable
DROP TABLE "chat_group_messages";

-- DropTable
DROP TABLE "chat_groups";

-- DropTable
DROP TABLE "chat_messages";

-- CreateTable
CREATE TABLE "e2ee_chat_rooms" (
    "id" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "name" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e2ee_chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_chat_room_members" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "lastDeliveredAt" TIMESTAMP(3),
    "encryptedRoomKey" TEXT,

    CONSTRAINT "e2ee_chat_room_members_pkey" PRIMARY KEY ("roomId","userId")
);

-- CreateTable
CREATE TABLE "e2ee_chat_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "encryptedPayload" TEXT NOT NULL,
    "mediaId" TEXT,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isUnsent" BOOLEAN NOT NULL DEFAULT false,
    "deletedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "e2ee_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_public_keys" (
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_public_keys_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "e2ee_chat_rooms_createdById_idx" ON "e2ee_chat_rooms"("createdById");

-- CreateIndex
CREATE INDEX "e2ee_chat_room_members_userId_idx" ON "e2ee_chat_room_members"("userId");

-- CreateIndex
CREATE INDEX "e2ee_chat_messages_roomId_createdAt_idx" ON "e2ee_chat_messages"("roomId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "e2ee_chat_messages_senderId_idx" ON "e2ee_chat_messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "media_expiresAt_idx" ON "media"("expiresAt");

-- AddForeignKey
ALTER TABLE "e2ee_chat_rooms" ADD CONSTRAINT "e2ee_chat_rooms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_chat_room_members" ADD CONSTRAINT "e2ee_chat_room_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "e2ee_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_chat_room_members" ADD CONSTRAINT "e2ee_chat_room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_chat_messages" ADD CONSTRAINT "e2ee_chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "e2ee_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_chat_messages" ADD CONSTRAINT "e2ee_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_chat_messages" ADD CONSTRAINT "e2ee_chat_messages_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_chat_messages" ADD CONSTRAINT "e2ee_chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "e2ee_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "e2ee_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_public_keys" ADD CONSTRAINT "user_public_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
