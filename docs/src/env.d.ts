declare interface ImportMetaEnv {
  readonly VERSION: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;

declare module 'bit-grid-component';
