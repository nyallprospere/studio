export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
    requestResourceData?: any;
  };
  
  export class FirestorePermissionError extends Error {
    constructor(public context: SecurityRuleContext) {
      const { path, operation } = context;
      super(
        `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
          {
            ...context,
            path: `/databases/(default)/documents${path.startsWith('/') ? '' : '/'}${path}`,
          },
          null,
          2
        )}`
      );
      this.name = 'FirestorePermissionError';
    }
}
  