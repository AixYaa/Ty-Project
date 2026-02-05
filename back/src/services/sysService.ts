import { getDb } from '../db/mongo';
import { ObjectId, Document } from 'mongodb';
import { SysEntity, SysView, SysSchema, SysMenu } from '../types/sys';

const COLLECTIONS = {
  ENTITY: 'sys_entity',
  VIEW: 'sys_view',
  SCHEMA: 'sys_schema',
  MENU: 'sys_menu'
};

export class SysService {
  
  // --- Generic Helpers ---
  private static async getCollection<T extends Document>(name: string) {
    return getDb().collection<T>(name);
  }

  private static toObjectId(id: string | ObjectId): ObjectId {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }

  // --- Entity Operations ---
  static async createEntity(data: SysEntity) {
    const col = await this.getCollection<SysEntity>(COLLECTIONS.ENTITY);
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async getEntities(query: any = {}) {
    const col = await this.getCollection<SysEntity>(COLLECTIONS.ENTITY);
    const { pageNum = 1, pageSize = 10, ...filter } = query;
    
    // Simple filter cleaning (remove empty strings)
    Object.keys(filter).forEach(key => {
      if (filter[key] === '' || filter[key] === undefined) {
        delete filter[key];
      } else if (typeof filter[key] === 'string') {
         filter[key] = { $regex: filter[key], $options: 'i' };
      }
    });

    const total = await col.countDocuments(filter);
    const list = await col.find(filter)
      .skip((Number(pageNum) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .sort({ createdAt: -1 })
      .toArray();

    return { list, total };
  }

  static async getEntityById(id: string) {
    const col = await this.getCollection<SysEntity>(COLLECTIONS.ENTITY);
    return col.findOne({ _id: this.toObjectId(id) });
  }

  static async updateEntity(id: string, data: Partial<SysEntity>) {
    const col = await this.getCollection<SysEntity>(COLLECTIONS.ENTITY);
    const update = { ...data, updatedAt: new Date() };
    delete (update as any)._id; // prevent _id update
    await col.updateOne({ _id: this.toObjectId(id) }, { $set: update });
    return this.getEntityById(id);
  }

  static async deleteEntity(id: string) {
    const col = await this.getCollection<SysEntity>(COLLECTIONS.ENTITY);
    return col.deleteOne({ _id: this.toObjectId(id) });
  }

  // --- View Operations ---
  static async createView(data: SysView) {
    const col = await this.getCollection<SysView>(COLLECTIONS.VIEW);
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async getViews(query: any = {}) {
    const col = await this.getCollection<SysView>(COLLECTIONS.VIEW);
    return col.find(query).toArray();
  }

  static async updateView(id: string, data: Partial<SysView>) {
    const col = await this.getCollection<SysView>(COLLECTIONS.VIEW);
    const update = { ...data, updatedAt: new Date() };
    delete (update as any)._id;
    await col.updateOne({ _id: this.toObjectId(id) }, { $set: update });
    return col.findOne({ _id: this.toObjectId(id) });
  }

  static async deleteView(id: string) {
    const col = await this.getCollection<SysView>(COLLECTIONS.VIEW);
    return col.deleteOne({ _id: this.toObjectId(id) });
  }

  // --- Schema Operations ---
  static async createSchema(data: SysSchema) {
    const col = await this.getCollection<SysSchema>(COLLECTIONS.SCHEMA);
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async getSchemas(query: any = {}) {
    const col = await this.getCollection<SysSchema>(COLLECTIONS.SCHEMA);
    return col.find(query).toArray();
  }

  static async getSchemaById(id: string) {
    const col = await this.getCollection<SysSchema>(COLLECTIONS.SCHEMA);
    return col.findOne({ _id: this.toObjectId(id) });
  }

  static async updateSchema(id: string, data: Partial<SysSchema>) {
    const col = await this.getCollection<SysSchema>(COLLECTIONS.SCHEMA);
    const update = { ...data, updatedAt: new Date() };
    delete (update as any)._id;
    await col.updateOne({ _id: this.toObjectId(id) }, { $set: update });
    return this.getSchemaById(id);
  }

  static async deleteSchema(id: string) {
    const col = await this.getCollection<SysSchema>(COLLECTIONS.SCHEMA);
    return col.deleteOne({ _id: this.toObjectId(id) });
  }

  // --- Menu Operations ---
  static async createMenu(data: SysMenu) {
    const col = await this.getCollection<SysMenu>(COLLECTIONS.MENU);
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async getMenus(query: any = {}) {
    const col = await this.getCollection<SysMenu>(COLLECTIONS.MENU);
    // Sort by sort order
    return col.find(query).sort({ sort: 1 }).toArray();
  }

  static async updateMenu(id: string, data: Partial<SysMenu>) {
    const col = await this.getCollection<SysMenu>(COLLECTIONS.MENU);
    const update = { ...data, updatedAt: new Date() };
    delete (update as any)._id;
    await col.updateOne({ _id: this.toObjectId(id) }, { $set: update });
    return col.findOne({ _id: this.toObjectId(id) });
  }

  static async deleteMenu(id: string) {
    const col = await this.getCollection<SysMenu>(COLLECTIONS.MENU);
    return col.deleteOne({ _id: this.toObjectId(id) });
  }

  static async deleteMenus(ids: string[]) {
    const col = await this.getCollection<SysMenu>(COLLECTIONS.MENU);
    const objectIds = ids.map(id => this.toObjectId(id));
    return col.deleteMany({ _id: { $in: objectIds } });
  }

  // --- Composite Operations ---
  // Example: Get full menu tree with schema info if needed
  static async getFullMenuTree(userRole?: string) {
    const menus = await this.getMenus({});
    
    // Filter menus based on role if provided and not super admin
    // Assuming 'admin' role sees everything, or if userRole is not provided (e.g. internal call)
    // But typically tree is requested by frontend user.
    let filteredMenus = menus;
    
    if (userRole && userRole !== 'admin') {
      filteredMenus = menus.filter(m => {
        // If roles is undefined or empty, it's public/visible to all (or logic could be: visible only if roles not set?)
        // Let's assume: if roles is set and not empty, user must have one of them.
        // If roles is empty/undefined, it is visible to everyone.
        if (m.roles && m.roles.length > 0) {
          return m.roles.includes(userRole);
        }
        return true;
      });
    }

    // Convert flat list to tree
    const map = new Map();
    const roots: any[] = [];
    
    filteredMenus.forEach(m => {
      map.set(m._id.toString(), { ...m, children: [] });
    });

    filteredMenus.forEach(m => {
      const node = map.get(m._id.toString());
      // Only attach to parent if parent also exists in filtered list
      if (m.parentId && map.has(m.parentId)) {
        map.get(m.parentId).children.push(node);
      } else {
        // If parent is filtered out (not visible), should we show this node as root?
        // Usually if parent is hidden, children are hidden too. 
        // With the filter above, if parent is removed, m.parentId won't be in map.
        // So we push to roots? Or we hide it?
        // Standard behavior: if parent is hidden, child is hidden (or becomes orphan).
        // Let's treat as orphan (root) for now if parent is missing, or maybe hide it?
        // Better logic: Recursively check visibility?
        // Simple logic: If parent is not in map, it becomes a root node (orphan).
        // However, if strict hierarchy is needed, maybe we should filter children of hidden parents.
        // For simplicity: Orphan nodes become roots.
        roots.push(node);
      }
    });

    return roots;
  }
}
