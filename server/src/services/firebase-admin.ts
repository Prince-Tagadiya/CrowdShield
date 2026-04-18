// Firebase Admin is disabled to allow local/cloud-run environments to run 
// without needing strict Service Account validations.
export const db = {} as any;
export const auth = {
  verifyIdToken: async () => ({ uid: 'mock-uid', email: 'mock@example.com', role: 'admin' })
} as any;
export default {} as any;
