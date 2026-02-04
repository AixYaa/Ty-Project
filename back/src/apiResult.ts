export class ApiResult {
  static success(data: any, msg: string = 'success') {
    return {
      status: 200,
      msg,
      data
    };
  }

  static error(msg: string = 'error', status: number = 500) {
    return {
      status,
      msg,
      data: null
    };
  }
}
