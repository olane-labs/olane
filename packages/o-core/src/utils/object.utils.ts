export class ObjectUtils {
  static isObject(obj: any): boolean {
    return obj !== null && typeof obj === 'object';
  }

  static async allKeyValues(
    obj: any,
    callback: (key: string, value: any) => Promise<any>,
  ): Promise<any> {
    if (!ObjectUtils.isObject(obj)) {
      return obj;
    }

    for (const key in obj) {
      let value = obj[key];
      // iterate over the object if not a primitive
      if (ObjectUtils.isObject(value)) {
        value = await ObjectUtils.allKeyValues(value, callback);
      } else {
        value = await callback(key, value);
      }
      // update the object
      obj[key] = value;
    }
    return obj;
  }
}
