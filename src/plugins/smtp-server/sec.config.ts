export default () => {
  return {
    port: 25,
    serverOptions: {},
    spfOptions: {},
    banner: null,
    domains: [],
    events: {
      onAuth: false,
      onConnect: false,
      onClose: false,
      onMailFrom: false,
      onRcptTo: false,
      onData: false,
      onError: false
    }
  };
};