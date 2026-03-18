import { createProdMockServer } from 'vite-plugin-mock/client';
import formMock from '../mock/form';

export function setupProdMockServer() {
  createProdMockServer([...formMock]);
}
