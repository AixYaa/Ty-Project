export type WorkflowTemplateStatus = 'enabled' | 'disabled';
export type WorkflowInstanceStatus = 'running' | 'completed' | 'rejected' | 'terminated';
export type WorkflowTaskStatus = 'pending' | 'approved' | 'rejected' | 'returned';
export type WorkflowTaskAction = 'approve' | 'reject' | 'back';

export interface WorkflowTemplate {
  _id?: any;
  name: string;
  key: string;
  description?: string;
  bpmnXml: string;
  startFormSchema?: Array<{
    field: string;
    label: string;
    type?: 'input' | 'textarea' | 'number' | 'date';
    required?: boolean;
    placeholder?: string;
  }>;
  defaultApprovers?: string[];
  status: WorkflowTemplateStatus;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkflowInstance {
  _id?: any;
  templateId: string;
  templateName: string;
  businessId?: string;
  title: string;
  status: WorkflowInstanceStatus;
  startedBy: string;
  approverChain?: string[];
  currentStep?: number;
  currentTaskId?: string | null;
  currentTaskTitle?: string | null;
  variables?: Record<string, any>;
  history?: Array<{
    action: string;
    operator: string;
    comment?: string;
    taskId?: string;
    at: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  endTime?: Date;
}

export interface WorkflowTask {
  _id?: any;
  instanceId: string;
  templateId: string;
  title: string;
  assignee: string;
  status: WorkflowTaskStatus;
  type: 'user';
  comment?: string;
  handledBy?: string;
  handledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
