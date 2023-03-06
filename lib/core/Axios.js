"use strict";

import utils from "./../utils.js";
import buildURL from "../helpers/buildURL.js";
import InterceptorManager from "./InterceptorManager.js";
import dispatchRequest from "./dispatchRequest.js";
import mergeConfig from "./mergeConfig.js";
import buildFullPath from "./buildFullPath.js";
import validator from "../helpers/validator.js";
import AxiosHeaders from "./AxiosHeaders.js";

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    // 1. 设置默认 config 对象为 defaults
    this.defaults = instanceConfig;

    // 2. 设置请求响应拦截器
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  // 3. "delete", "get", "head", "post", "put", "patch", "common" 方法请求通用方法
  request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API

    // 4. 处理请求 config, 都变成对象
    if (typeof configOrUrl === "string") {
      // 如果 configOrUrl 是字符串, config 赋值成一个对象, 并将值赋值到 url
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    config = mergeConfig(this.defaults, config); // 5. 合并 config, 请求新传入的 config 会覆盖默认 new Axios 传入的 config

    const { transitional, paramsSerializer, headers } = config;

    // 6. 处理 transitional
    if (transitional !== undefined) {
      validator.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
        },
        false
      );
    }
    // 7. 串联请求参数
    if (paramsSerializer !== undefined) {
      validator.assertOptions(
        paramsSerializer,
        {
          encode: validators.function,
          serialize: validators.function,
        },
        true
      );
    }

    // Set config.method
    // 8. 处理请求 method
    config.method = (
      config.method ||
      this.defaults.method ||
      "get"
    ).toLowerCase();

    // 9. 处理请求 headers
    let contextHeaders;

    // Flatten headers
    contextHeaders =
      headers && utils.merge(headers.common, headers[config.method]);

    contextHeaders &&
      utils.forEach(
        ["delete", "get", "head", "post", "put", "patch", "common"],
        (method) => {
          delete headers[method];
        }
      );

    config.headers = AxiosHeaders.concat(contextHeaders, headers);

    // filter out skipped interceptors
    // 10.
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(
      interceptor
    ) {
      if (
        typeof interceptor.runWhen === "function" &&
        interceptor.runWhen(config) === false
      ) {
        return;
      }

      synchronousRequestInterceptors =
        synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(
        interceptor.fulfilled,
        interceptor.rejected
      );
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(
      interceptor
    ) {
      responseInterceptorChain.push(
        interceptor.fulfilled,
        interceptor.rejected
      );
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(
        responseInterceptorChain[i++],
        responseInterceptorChain[i++]
      );
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
utils.forEach(
  ["delete", "get", "head", "options"],
  function forEachMethodNoData(method) {
    /*eslint func-names:0*/
    Axios.prototype[method] = function (url, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data,
        })
      );
    };
  }
);

utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          headers: isForm
            ? {
                "Content-Type": "multipart/form-data",
              }
            : {},
          url,
          data,
        })
      );
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});

export default Axios;
