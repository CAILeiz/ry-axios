"use strict";

import transformData from "./transformData.js";
import isCancel from "../cancel/isCancel.js";
import defaults from "../defaults/index.js";
import CanceledError from "../cancel/CanceledError.js";
import AxiosHeaders from "../core/AxiosHeaders.js";
import adapters from "../adapters/adapters.js";

/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
export default function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // 1. 处理headers
  config.headers = AxiosHeaders.from(config.headers);

  // Transform request data
  // 2. 处理 data, 根据默认 defaults 配置组装 data
  config.data = transformData.call(config, config.transformRequest);

  // 给这三个方法设置 "application/x-www-form-urlencoded", false
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }

  // 4. 获取要使用的请求方法, http 或者是 xhr
  const adapter = adapters.getAdapter(config.adapter || defaults.adapter);

  // 5. 请求 返回响应
  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);

      // Transform response data
      response.data = transformData.call(
        config,
        config.transformResponse,
        response
      );

      response.headers = AxiosHeaders.from(response.headers);

      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);

        // Transform response data
        if (reason && reason.response) {
          reason.response.data = transformData.call(
            config,
            config.transformResponse,
            reason.response
          );
          reason.response.headers = AxiosHeaders.from(reason.response.headers);
        }
      }

      return Promise.reject(reason);
    }
  );
}
