import swaggerJSDoc from 'swagger-jsdoc';

import { env } from '../config/env.js';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Costy API',
      version: '0.1.0',
      description:
        'REST API for Costy. Auth dùng Better Auth session cookie (`better-auth.session_token`), không phải Bearer JWT. Route ghi `security: []` hoặc optional cookie là public / không bắt buộc đăng nhập.',
    },
    servers: [{ url: `${env.SERVER_URL}/api/v1`, description: 'Local' }],
    tags: [
      { name: 'Health' },
      { name: 'Posts' },
      { name: 'Search' },
      { name: 'Users' },
      { name: 'Friends' },
      { name: 'Me' },
      { name: 'Blocks' },
      { name: 'Chat' },
      { name: 'Media' },
      { name: 'Notifications' },
      { name: 'Reports' },
      { name: 'Admin' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Better Auth web session cookie',
        },
      },
      parameters: {
        CursorQuery: {
          in: 'query',
          name: 'cursor',
          schema: { type: 'string' },
          description: 'Cursor phân trang',
        },
        LimitQuery: {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
        PostIdPath: {
          in: 'path',
          name: 'postId',
          required: true,
          schema: { type: 'string' },
        },
        UsernamePath: {
          in: 'path',
          name: 'username',
          required: true,
          schema: { type: 'string', maxLength: 64 },
        },
        UserIdPath: {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
        },
      },
      schemas: {
        PostVisibility: {
          type: 'string',
          enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
        },
        CreatePostBody: {
          type: 'object',
          properties: {
            content: { type: 'string', maxLength: 2000 },
            parentId: { type: 'string', description: 'ID bài viết cha (comment/reply)' },
            visibility: { $ref: '#/components/schemas/PostVisibility' },
            files: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
            },
          },
        },
        UpdatePostBody: {
          type: 'object',
          minProperties: 1,
          description: 'Cần ít nhất một trong content / visibility',
          properties: {
            content: { type: 'string', maxLength: 2000 },
            visibility: { $ref: '#/components/schemas/PostVisibility' },
          },
        },
        ReactionBody: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              nullable: true,
              enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'],
              description: 'null = bỏ reaction',
            },
          },
        },
        CreateReportBody: {
          type: 'object',
          required: ['targetType', 'targetId', 'reason'],
          properties: {
            targetType: { type: 'string', enum: ['POST', 'USER', 'COMMENT'] },
            targetId: { type: 'string' },
            reason: {
              type: 'string',
              enum: [
                'SPAM',
                'BULLYING',
                'MINOR_SAFETY',
                'SELF_HARM',
                'VIOLENCE',
                'RESTRICTED_GOODS',
                'ADULT_CONTENT',
                'MISINFORMATION',
                'IP_VIOLATION',
                'NOT_INTERESTED',
              ],
            },
            description: { type: 'string', maxLength: 1000 },
          },
        },
        UpdateMyProfileBody: {
          type: 'object',
          minProperties: 1,
          description: 'Cần ít nhất một trong name / bio',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            bio: { type: 'string', nullable: true, maxLength: 160 },
          },
        },
        UpdateUserSettingsBody: {
          type: 'object',
          minProperties: 1,
          description: 'Cần ít nhất một trong showActivityStatus / notificationPreferences',
          properties: {
            showActivityStatus: { type: 'boolean' },
            notificationPreferences: {
              type: 'object',
              additionalProperties: false,
              description: 'Partial — chỉ gửi key muốn đổi',
              minProperties: 1,
              properties: {
                postLiked: { type: 'boolean' },
                postReplied: { type: 'boolean' },
                postCommentedFollowed: { type: 'boolean' },
                userFollowed: { type: 'boolean' },
                friendRequest: { type: 'boolean' },
                friendAccepted: { type: 'boolean' },
                mention: { type: 'boolean' },
                messageReceived: { type: 'boolean' },
              },
            },
          },
        },
        CreateChatRoomBody: {
          type: 'object',
          required: ['memberUserIds'],
          properties: {
            isGroup: { type: 'boolean' },
            name: { type: 'string', maxLength: 191 },
            memberUserIds: {
              type: 'array',
              minItems: 1,
              items: { type: 'string' },
            },
          },
        },
        AppealSubmitBody: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 10, maxLength: 2000 },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.controller.ts',
    './src/modules/**/*.openapi.ts',
  ],
});
