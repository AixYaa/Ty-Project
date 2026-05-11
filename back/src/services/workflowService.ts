import { ObjectId } from 'mongodb';
import { getDb } from '../db/mongo';
import type {
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowTask,
  WorkflowTaskAction,
  WorkflowTemplate
} from '../types/workflow';

const COLLECTIONS = {
  TEMPLATE: 'wf模板',
  INSTANCE: 'wf实例',
  TASK: 'wf任务'
};

export class WorkflowService {
  private static templateCol() {
    return getDb().collection<WorkflowTemplate>(COLLECTIONS.TEMPLATE);
  }

  private static instanceCol() {
    return getDb().collection<WorkflowInstance>(COLLECTIONS.INSTANCE);
  }

  private static taskCol() {
    return getDb().collection<WorkflowTask>(COLLECTIONS.TASK);
  }

  private static toObjectId(id: string) {
    return new ObjectId(id);
  }

  private static normalizeStartFormSchema(input: any) {
    if (!Array.isArray(input)) return [];
    return input
      .map((item) => ({
        field: String(item?.field || '').trim(),
        label: String(item?.label || '').trim(),
        type: ['input', 'textarea', 'number', 'date'].includes(String(item?.type || ''))
          ? String(item.type)
          : 'input',
        required: Boolean(item?.required),
        placeholder: String(item?.placeholder || '').trim()
      }))
      .filter((item) => item.field && item.label);
  }

  private static normalizeApprovers(input: any) {
    if (!Array.isArray(input)) return [];
    return input.map((item) => String(item || '').trim()).filter(Boolean);
  }

  private static extractApproversFromBpmnXml(xml: string) {
    const source = String(xml || '');
    if (!source) return [];
    const approvers: string[] = [];
    // 兼容 bpmn:userTask 与 bpmn:task，两者都可能被用于审批节点
    const taskRegex = /<bpmn:(userTask|task)\b([^>]*)>/g;
    let match: RegExpExecArray | null;
    while ((match = taskRegex.exec(source))) {
      const attrs = String(match[2] || '');
      const assigneeMatch = attrs.match(/camunda:assignee="([^"]+)"/);
      const assignee = String(assigneeMatch?.[1] || '').trim();
      if (assignee) approvers.push(assignee);
    }
    return this.normalizeApprovers(approvers);
  }

  static async createTemplate(payload: Partial<WorkflowTemplate>, username: string) {
    const col = this.templateCol();
    const now = new Date();
    const doc: WorkflowTemplate = {
      name: String(payload.name || '').trim(),
      key: String(payload.key || '').trim(),
      description: String(payload.description || '').trim(),
      bpmnXml: String(payload.bpmnXml || '').trim(),
      startFormSchema: this.normalizeStartFormSchema(payload.startFormSchema),
      defaultApprovers: this.normalizeApprovers(payload.defaultApprovers),
      status: payload.status === 'disabled' ? 'disabled' : 'enabled',
      createdBy: username,
      createdAt: now,
      updatedAt: now
    };
    if (!doc.name || !doc.key) {
      throw new Error('模板名称和唯一标识不能为空');
    }
    const exists = await col.findOne({ key: doc.key });
    if (exists) {
      throw new Error('模板标识已存在');
    }
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  static async updateTemplate(id: string, payload: Partial<WorkflowTemplate>) {
    const col = this.templateCol();
    const update: Partial<WorkflowTemplate> = {
      updatedAt: new Date()
    };
    if (payload.name !== undefined) update.name = String(payload.name || '').trim();
    if (payload.description !== undefined) update.description = String(payload.description || '').trim();
    if (payload.bpmnXml !== undefined) update.bpmnXml = String(payload.bpmnXml || '').trim();
    if (payload.startFormSchema !== undefined) {
      update.startFormSchema = this.normalizeStartFormSchema(payload.startFormSchema);
    }
    if (payload.defaultApprovers !== undefined) {
      update.defaultApprovers = this.normalizeApprovers(payload.defaultApprovers);
    }
    if (payload.status !== undefined) update.status = payload.status === 'disabled' ? 'disabled' : 'enabled';
    if (payload.key !== undefined) {
      const nextKey = String(payload.key || '').trim();
      if (!nextKey) throw new Error('模板标识不能为空');
      const dup = await col.findOne({ key: nextKey, _id: { $ne: this.toObjectId(id) } as any });
      if (dup) throw new Error('模板标识已存在');
      update.key = nextKey;
    }
    await col.updateOne({ _id: this.toObjectId(id) }, { $set: update });
    return col.findOne({ _id: this.toObjectId(id) });
  }

  static async deleteTemplate(id: string) {
    const col = this.templateCol();
    return col.deleteOne({ _id: this.toObjectId(id) });
  }

  static async getTemplateById(id: string) {
    return this.templateCol().findOne({ _id: this.toObjectId(id) });
  }

  static async getTemplates(query: Record<string, any>) {
    const col = this.templateCol();
    const { pageNum = 1, pageSize = 10, ...filters } = query || {};
    const mongoFilter: Record<string, any> = {};
    if (filters.name) mongoFilter.name = { $regex: String(filters.name), $options: 'i' };
    if (filters.key) mongoFilter.key = { $regex: String(filters.key), $options: 'i' };
    if (filters.status) mongoFilter.status = String(filters.status);

    const total = await col.countDocuments(mongoFilter);
    const list = await col
      .find(mongoFilter)
      .sort({ updatedAt: -1 })
      .skip((Number(pageNum) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .toArray();
    return { list, total, pageNum: Number(pageNum), pageSize: Number(pageSize) };
  }

  static async startInstance(payload: any, username: string) {
    const templateId = String(payload.templateId || '');
    if (!templateId) throw new Error('templateId 不能为空');
    const template = await this.getTemplateById(templateId);
    if (!template) throw new Error('模板不存在');
    if (template.status !== 'enabled') throw new Error('模板未启用，无法启动实例');

    const now = new Date();
    const instanceCol = this.instanceCol();
    const taskCol = this.taskCol();
    const payloadApproverChain = Array.isArray(payload?.approverChain)
      ? this.normalizeApprovers(payload.approverChain)
      : [];
    const templateApproverChain = this.normalizeApprovers(template.defaultApprovers);
    const bpmnApproverChain = this.extractApproversFromBpmnXml(template.bpmnXml);
    const approverChain =
      payloadApproverChain.length > 0
        ? payloadApproverChain
        : templateApproverChain.length > 0
          ? templateApproverChain
          : bpmnApproverChain;
    const firstAssignee = String(payload.assignee || approverChain[0] || username).trim();
    const currentStep = approverChain.length > 0 ? 0 : -1;

    const instanceDoc: WorkflowInstance = {
      templateId,
      templateName: template.name,
      businessId: String(payload.businessId || '').trim() || undefined,
      title: String(payload.title || `${template.name}实例`).trim(),
      status: 'running',
      startedBy: username,
      approverChain,
      currentStep,
      currentTaskId: null,
      currentTaskTitle: null,
      variables: payload.variables && typeof payload.variables === 'object' ? payload.variables : {},
      history: [
        {
          action: 'start',
          operator: username,
          comment: String(payload.comment || '').trim() || undefined,
          at: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    const insRes = await instanceCol.insertOne(instanceDoc);
    const instanceId = insRes.insertedId.toString();

    const firstTask: WorkflowTask = {
      instanceId,
      templateId,
      title: String(payload.firstTaskTitle || '首个审批节点').trim(),
      assignee: firstAssignee || username,
      status: 'pending',
      type: 'user',
      createdAt: now,
      updatedAt: now
    };
    const taskRes = await taskCol.insertOne(firstTask);
    await instanceCol.updateOne(
      { _id: insRes.insertedId },
      {
        $set: {
          currentTaskId: taskRes.insertedId.toString(),
          currentTaskTitle: firstTask.title,
          updatedAt: new Date()
        }
      }
    );
    return instanceCol.findOne({ _id: insRes.insertedId });
  }

  static async terminateInstance(id: string, operator: string, comment?: string) {
    const col = this.instanceCol();
    const now = new Date();
    await col.updateOne(
      { _id: this.toObjectId(id) },
      {
        $set: {
          status: 'terminated' as WorkflowInstanceStatus,
          currentTaskId: null,
          currentTaskTitle: null,
          endTime: now,
          updatedAt: now
        },
        $push: {
          history: {
            action: 'terminate',
            operator,
            comment: comment || undefined,
            at: now
          } as any
        }
      }
    );
    await this.taskCol().updateMany(
      { instanceId: id, status: 'pending' },
      { $set: { status: 'returned', updatedAt: now, handledBy: operator, handledAt: now, comment: comment || '实例终止' } }
    );
    return col.findOne({ _id: this.toObjectId(id) });
  }

  static async getInstances(query: Record<string, any>) {
    const col = this.instanceCol();
    const { pageNum = 1, pageSize = 10, ...filters } = query || {};
    const mongoFilter: Record<string, any> = {};
    if (filters.templateName) mongoFilter.templateName = { $regex: String(filters.templateName), $options: 'i' };
    if (filters.businessId) mongoFilter.businessId = { $regex: String(filters.businessId), $options: 'i' };
    if (filters.status) mongoFilter.status = String(filters.status);
    if (filters.startedBy) mongoFilter.startedBy = { $regex: String(filters.startedBy), $options: 'i' };

    const total = await col.countDocuments(mongoFilter);
    const list = await col
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip((Number(pageNum) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .toArray();
    return { list, total, pageNum: Number(pageNum), pageSize: Number(pageSize) };
  }

  static async getInstanceDetail(id: string) {
    const instance = await this.instanceCol().findOne({ _id: this.toObjectId(id) });
    if (!instance) return null;
    const tasks = await this.taskCol().find({ instanceId: id }).sort({ createdAt: 1 }).toArray();
    return { ...instance, tasks };
  }

  static async getTasks(query: Record<string, any>) {
    const col = this.taskCol();
    const { pageNum = 1, pageSize = 10, ...filters } = query || {};
    const mongoFilter: Record<string, any> = {};
    if (filters.status) mongoFilter.status = String(filters.status);
    if (filters.assignee) mongoFilter.assignee = { $regex: String(filters.assignee), $options: 'i' };
    if (filters.instanceId) mongoFilter.instanceId = String(filters.instanceId);
    if (filters.title) mongoFilter.title = { $regex: String(filters.title), $options: 'i' };

    const total = await col.countDocuments(mongoFilter);
    const list = await col
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip((Number(pageNum) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .toArray();
    return { list, total, pageNum: Number(pageNum), pageSize: Number(pageSize) };
  }

  static async handleTask(
    taskId: string,
    action: WorkflowTaskAction,
    operator: string,
    payload: any = {},
    allowAnyAssignee = false
  ) {
    const taskCol = this.taskCol();
    const instanceCol = this.instanceCol();
    const task = await taskCol.findOne({ _id: this.toObjectId(taskId) });
    if (!task) throw new Error('任务不存在');
    if (task.status !== 'pending') throw new Error('任务已处理，不能重复操作');
    if (!allowAnyAssignee) {
      const assignee = String(task.assignee || '').trim();
      const currentUser = String(operator || '').trim();
      if (assignee && currentUser !== assignee) {
        throw new Error(`无权处理该任务，当前处理人应为：${assignee}`);
      }
    }

    const now = new Date();
    const taskStatusMap = {
      approve: 'approved',
      reject: 'rejected',
      back: 'returned'
    } as const;
    const nextStatus = taskStatusMap[action];

    await taskCol.updateOne(
      { _id: task._id as any },
      {
        $set: {
          status: nextStatus,
          handledBy: operator,
          handledAt: now,
          comment: String(payload.comment || '').trim() || undefined,
          updatedAt: now
        }
      }
    );

    const instance = await instanceCol.findOne({ _id: this.toObjectId(task.instanceId) });
    if (!instance) throw new Error('实例不存在');

    if (action === 'approve') {
      const currentStep = Number(instance.currentStep ?? -1);
      const nextByChain =
        Array.isArray(instance.approverChain) && instance.approverChain.length > currentStep + 1
          ? String(instance.approverChain[currentStep + 1] || '').trim()
          : '';
      const nextAssignee = String(payload.nextAssignee || nextByChain || '').trim();
      const nextTitle = String(payload.nextTitle || '下一审批节点').trim();
      if (nextAssignee) {
        const nextTask: WorkflowTask = {
          instanceId: task.instanceId,
          templateId: task.templateId,
          title: nextTitle,
          assignee: nextAssignee,
          status: 'pending',
          type: 'user',
          createdAt: now,
          updatedAt: now
        };
        const nextRes = await taskCol.insertOne(nextTask);
        await instanceCol.updateOne(
          { _id: instance._id as any },
          {
            $set: {
              status: 'running',
              currentStep: currentStep + 1,
              currentTaskId: nextRes.insertedId.toString(),
              currentTaskTitle: nextTitle,
              updatedAt: now
            },
            $push: {
              history: {
                action: 'approve',
                operator,
                taskId,
                comment: String(payload.comment || '').trim() || undefined,
                at: now
              } as any
            }
          }
        );
      } else {
        await instanceCol.updateOne(
          { _id: instance._id as any },
          {
            $set: {
              status: 'completed',
              currentTaskId: null,
              currentTaskTitle: null,
              endTime: now,
              updatedAt: now
            },
            $push: {
              history: {
                action: 'complete',
                operator,
                taskId,
                comment: String(payload.comment || '').trim() || undefined,
                at: now
              } as any
            }
          }
        );
      }
    } else if (action === 'reject') {
      await instanceCol.updateOne(
        { _id: instance._id as any },
        {
          $set: {
            status: 'rejected',
            currentTaskId: null,
            currentTaskTitle: null,
            endTime: now,
            updatedAt: now
          },
          $push: {
            history: {
              action: 'reject',
              operator,
              taskId,
              comment: String(payload.comment || '').trim() || undefined,
              at: now
            } as any
          }
        }
      );
    } else {
      const rollbackAssignee = String(payload.nextAssignee || instance.startedBy || operator).trim();
      const rollbackTitle = String(payload.nextTitle || '回退处理').trim();
      const nextTask: WorkflowTask = {
        instanceId: task.instanceId,
        templateId: task.templateId,
        title: rollbackTitle,
        assignee: rollbackAssignee,
        status: 'pending',
        type: 'user',
        createdAt: now,
        updatedAt: now
      };
      const nextRes = await taskCol.insertOne(nextTask);
      await instanceCol.updateOne(
        { _id: instance._id as any },
        {
          $set: {
            status: 'running',
            currentTaskId: nextRes.insertedId.toString(),
            currentTaskTitle: rollbackTitle,
            updatedAt: now
          },
          $push: {
            history: {
              action: 'back',
              operator,
              taskId,
              comment: String(payload.comment || '').trim() || undefined,
              at: now
            } as any
          }
        }
      );
    }

    return this.getInstanceDetail(task.instanceId);
  }
}
