import { ErrorCode } from './types/errorCode';

export class ApiResult {
  static success(data: any, msg: string = 'success') {
    return {
      status: 200,
      code: ErrorCode.SUCCESS,
      msg,
      data
    };
  }

  static error(msg: string = 'error', status: number = 500, code: number = ErrorCode.INTERNAL_ERROR) {
    return {
      status,
      code,
      msg,
      data: null
    };
  }
}
