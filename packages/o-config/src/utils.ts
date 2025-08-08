const dynamicImport = async (packageName: string) =>
  new Function(`return import('${packageName}')`)();

export async function initDynamicImports(libs: string[]) {
  return await Promise.all(libs.map((lib) => dynamicImport(lib)));
}
