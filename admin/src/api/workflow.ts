import request from '@/utils/request';

export const getWorkflowTemplates = (params?: any) => {
  return request.get('/workflow/template', { params });
};

export const createWorkflowTemplate = (data: any) => {
  return request.post('/workflow/template', data);
};

export const updateWorkflowTemplate = (id: string, data: any) => {
  return request.put(`/workflow/template/${id}`, data);
};

export const deleteWorkflowTemplate = (id: string) => {
  return request.delete(`/workflow/template/${id}`);
};

export const getWorkflowInstances = (params?: any) => {
  return request.get('/workflow/instance', { params });
};

export const getWorkflowInstanceDetail = (id: string) => {
  return request.get(`/workflow/instance/${id}`);
};

export const startWorkflowInstance = (data: any) => {
  return request.post('/workflow/instance', data);
};

export const terminateWorkflowInstance = (id: string, data?: any) => {
  return request.put(`/workflow/instance/${id}/terminate`, data || {});
};

export const getWorkflowTasks = (params?: any) => {
  return request.get('/workflow/task', { params });
};

export const handleWorkflowTask = (id: string, data: any) => {
  return request.put(`/workflow/task/${id}/handle`, data);
};

export const getWorkflowUserOptions = (params?: any) => {
  return request.get('/core/sys用户', { params });
};
