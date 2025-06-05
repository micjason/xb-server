/**
 * 统一API响应格式工具
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 返回的数据
 * @param {string} message - 成功消息
 * @param {number} code - 状态码，默认200
 */
exports.success = (res, data = null, message = '操作成功', code = 200) => {
  return res.status(200).json({
    code,
    message,
    success: true,
    data
  });
};

/**
 * 失败响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} code - 错误码，默认400
 * @param {number} httpStatus - HTTP状态码，默认与code相同
 */
exports.error = (res, message = '操作失败', code = 400, httpStatus = null) => {
  const status = httpStatus || (code >= 500 ? 500 : code >= 400 ? code : 400);
  return res.status(status).json({
    code,
    message,
    success: false
  });
};

/**
 * 分页成功响应
 * @param {Object} res - Express响应对象
 * @param {Array} list - 数据列表
 * @param {number} total - 总数
 * @param {string} message - 成功消息
 */
exports.successWithPagination = (res, list, total, message = '获取成功') => {
  return res.status(200).json({
    code: 200,
    message,
    success: true,
    data: {
      list,
      total
    }
  });
};

/**
 * 常用的错误响应快捷方法
 */
exports.notFound = (res, message = '资源不存在') => {
  return exports.error(res, message, 404, 404);
};

exports.badRequest = (res, message = '请求参数错误') => {
  return exports.error(res, message, 400, 400);
};

exports.unauthorized = (res, message = '未授权访问') => {
  return exports.error(res, message, 401, 401);
};

exports.forbidden = (res, message = '权限不足') => {
  return exports.error(res, message, 403, 403);
};

exports.serverError = (res, message = '服务器内部错误') => {
  return exports.error(res, message, 500, 500);
}; 