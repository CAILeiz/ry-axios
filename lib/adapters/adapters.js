import utils from "../utils.js";
import httpAdapter from "./http.js";
import xhrAdapter from "./xhr.js";
import AxiosError from "../core/AxiosError.js";

const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
};

utils.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, "adapterName", { value });
  }
});

export default {
  getAdapter: (adapters) => {
    // 1. 将 adapters 组装成数组
    adapters = utils.isArray(adapters) ? adapters : [adapters];

    const { length } = adapters;
    let nameOrAdapter;
    let adapter;

    // 2. 遍历赋值最后需要的请求方法, http 或者 xhr
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      if (
        (adapter = utils.isString(nameOrAdapter)
          ? knownAdapters[nameOrAdapter.toLowerCase()]
          : nameOrAdapter)
      ) {
        break;
      }
    }

    return adapter;
  },
  adapters: knownAdapters,
};
