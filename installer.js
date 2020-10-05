exports.default = ( jsonConfig, pluginName ) => {
  jsonConfig.plugins = jsonConfig.plugins || {};
  jsonConfig.plugins[pluginName] = jsonConfig.plugins[pluginName] || {};
  jsonConfig.plugins[pluginName].serverOptions = jsonConfig.plugins[pluginName].serverOptions || {};
  jsonConfig.plugins[pluginName].port = jsonConfig.plugins[pluginName].port || 25;
  jsonConfig.plugins[pluginName].banner = jsonConfig.plugins[pluginName].serverOptions || null;
  jsonConfig.plugins[pluginName].domains = jsonConfig.plugins[pluginName].serverOptions || [];

  return jsonConfig;
}