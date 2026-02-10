import { getDb } from '../db/mongo';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export class GeneralService {
  
  private static async getCollection(name: string) {
    return getDb().collection(name);
  }

  private static toObjectId(id: string | ObjectId): ObjectId {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }

  // Get By Id
  static async getById(collectionName: string, id: string) {
    const col = await this.getCollection(collectionName);
    return col.findOne({ _id: this.toObjectId(id) });
  }

  // List / Search
  static async getList(collectionName: string, query: any = {}, pageNum: number = 1, pageSize: number = 10) {
    const col = await this.getCollection(collectionName);
    
    // Construct filter
    const filter: any = {};
    // Basic exact match for now, or use specific query parser
    // Exclude special params
    const exclude = ['pageNum', 'pageSize', 'sort', 'order'];
    Object.keys(query).forEach(key => {
      if (!exclude.includes(key) && query[key] !== '' && query[key] !== undefined) {
         // Try regex for string, exact for others
         // This is a simple generic implementation
         filter[key] = { $regex: query[key], $options: 'i' };
      }
    });

    const total = await col.countDocuments(filter);
    const list = await col.find(filter)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 }) // Default sort by newest
      .toArray();

    return {
      list,
      total,
      pageNum,
      pageSize
    };
  }

  // Create
  static async create(collectionName: string, data: any) {
    const col = await this.getCollection(collectionName);
    
    // Special handling for User password
    if (collectionName === 'sys用户' && data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const doc = { 
      ...data, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  // Update
  static async update(collectionName: string, id: string, data: any) {
    const col = await this.getCollection(collectionName);
    
    // Special handling for User password
    if (collectionName === 'sys用户') {
      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
      } else {
        // If password is empty/undefined, do not update it
        delete data.password;
      }
    }

    const update = { 
      ...data, 
      updatedAt: new Date() 
    };
    delete update._id; // Ensure _id is not updated
    await col.updateOne({ _id: this.toObjectId(id) }, { $set: update });
    return col.findOne({ _id: this.toObjectId(id) });
  }

  // Delete
  static async delete(collectionName: string, id: string) {
    const col = await this.getCollection(collectionName);
    return col.deleteOne({ _id: this.toObjectId(id) });
  }

  // Batch Delete
  static async batchDelete(collectionName: string, ids: string[]) {
    const col = await this.getCollection(collectionName);
    const objectIds = ids.map(id => this.toObjectId(id));
    return col.deleteMany({ _id: { $in: objectIds } });
  }
}
