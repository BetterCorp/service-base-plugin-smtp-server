export interface ISMTPServerConfig {
  port: number;
  banner: string;
  domains: Array<string>;
  serverOptions: any;
}