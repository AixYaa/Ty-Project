import { ObjectId } from 'mongodb';
import { getDb } from '../db/mongo';
import { AiMessage } from '../types/ai';

const COLLECTION_NAME = 'sys_ai_conversations';

interface AiConversationDoc {
  _id?: ObjectId;
  userId: string;
  title: string;
  provider: string;
  model: string;
  useProjectContext: boolean;
  messages: AiMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export class AiConversationService {
  private static safeObjectId(id: string): ObjectId | null {
    try {
      return new ObjectId(id);
    } catch {
      return null;
    }
  }

  private static buildTitleFromMessage(content: string): string {
    const cleaned = (content || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '新会话';
    return cleaned.length > 24 ? `${cleaned.slice(0, 24)}...` : cleaned;
  }

  static async appendRound(params: {
    conversationId?: string;
    userId: string;
    provider: string;
    model: string;
    useProjectContext: boolean;
    userMessage: AiMessage;
    assistantMessage: AiMessage;
  }): Promise<string> {
    const db = getDb();
    const now = new Date();
    const {
      conversationId,
      userId,
      provider,
      model,
      useProjectContext,
      userMessage,
      assistantMessage
    } = params;

    if (conversationId) {
      const objectId = this.safeObjectId(conversationId);
      if (objectId) {
        const result = await db.collection<AiConversationDoc>(COLLECTION_NAME).findOneAndUpdate(
          { _id: objectId, userId },
          {
            $set: {
              provider,
              model,
              useProjectContext,
              updatedAt: now
            },
            $push: {
              messages: { $each: [userMessage, assistantMessage] }
            }
          },
          { returnDocument: 'after' }
        );

        if (result?._id) {
          return result._id.toString();
        }
      }
    }

    const doc: AiConversationDoc = {
      userId,
      title: this.buildTitleFromMessage(userMessage.content),
      provider,
      model,
      useProjectContext,
      messages: [userMessage, assistantMessage],
      createdAt: now,
      updatedAt: now
    };
    const inserted = await db.collection<AiConversationDoc>(COLLECTION_NAME).insertOne(doc);
    return inserted.insertedId.toString();
  }

  static async listByUser(userId: string, limit: number = 30) {
    const db = getDb();
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const list = await db
      .collection<AiConversationDoc>(COLLECTION_NAME)
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(safeLimit)
      .toArray();

    return list.map((item) => {
      const lastMessage = [...(item.messages || [])].reverse().find((m) => m.role === 'assistant' || m.role === 'user');
      return {
        id: item._id?.toString(),
        title: item.title,
        provider: item.provider,
        model: item.model,
        useProjectContext: item.useProjectContext,
        updatedAt: item.updatedAt,
        lastMessage: lastMessage?.content || ''
      };
    });
  }

  static async getById(userId: string, id: string) {
    const db = getDb();
    const objectId = this.safeObjectId(id);
    if (!objectId) return null;
    const doc = await db.collection<AiConversationDoc>(COLLECTION_NAME).findOne({ _id: objectId, userId });
    if (!doc) return null;
    return {
      id: doc._id?.toString(),
      title: doc.title,
      provider: doc.provider,
      model: doc.model,
      useProjectContext: doc.useProjectContext,
      messages: doc.messages || [],
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt
    };
  }

  static async deleteById(userId: string, id: string) {
    const db = getDb();
    const objectId = this.safeObjectId(id);
    if (!objectId) return 0;
    const result = await db.collection<AiConversationDoc>(COLLECTION_NAME).deleteOne({ _id: objectId, userId });
    return result.deletedCount;
  }

  static async clearByUser(userId: string) {
    const db = getDb();
    const result = await db.collection<AiConversationDoc>(COLLECTION_NAME).deleteMany({ userId });
    return result.deletedCount;
  }
}

