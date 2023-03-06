"use strict";

import utils from "./utils.js";
import bind from "./helpers/bind.js";
import Axios from "./core/Axios.js";
import mergeConfig from "./core/mergeConfig.js";
import defaults from "./defaults/index.js";
import formDataToJSON from "./helpers/formDataToJSON.js";
import CanceledError from "./cancel/CanceledError.js";
import CancelToken from "./cancel/CancelToken.js";
import isCancel from "./cancel/isCancel.js";
import { VERSION } from "./env/data.js";
import toFormData from "./helpers/toFormData.js";
import AxiosError from "./core/AxiosError.js";
import spread from "./helpers/spread.js";
import isAxiosError from "./helpers/isAxiosError.js";
import AxiosHeaders from "./core/AxiosHeaders.js";
import HttpStatusCode from "./helpers/HttpStatusCode.js";

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  // 1. 创建 Axios 实例
  const context = new Axios(defaultConfig);

  // 2. 执行 Axios.prototype.request, 以 axios 实例为 this 指向
  const instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  // 3. 复制 Axios.prototype 参数到 instance 上, 以 axios 实例为 this 指向
  utils.extend(instance, Axios.prototype, context, { allOwnKeys: true });

  // Copy context to instance
  // 4. 复制 axios 实例上的方法到 Axios.prototype.request 上
  utils.extend(instance, context, null, { allOwnKeys: true });

  // Factory for creating new instances
  // 5. 创建一个工厂函数
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
const axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;

// Expose AxiosError class
axios.AxiosError = AxiosError;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = spread;

// Expose isAxiosError
axios.isAxiosError = isAxiosError;

// Expose mergeConfig
axios.mergeConfig = mergeConfig;

axios.AxiosHeaders = AxiosHeaders;

axios.formToJSON = (thing) =>
  formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

axios.HttpStatusCode = HttpStatusCode;

axios.default = axios;

// this module should only have a default export
export default axios;
