import { MockMethod } from 'vite-plugin-mock';

export default [
  {
    url: '/mock/form/submit',
    method: 'post',
    response: (opt: any) => {
      const { body } = opt;
      console.log('Mock Form Submit:', body);
      return {
        status: 200,
        code: 0,
        msg: 'Mock Submit Success',
        data: {
          id: Math.floor(Math.random() * 10000),
          ...body,
          createTime: new Date().toISOString()
        }
      };
    }
  }
] as MockMethod[];
