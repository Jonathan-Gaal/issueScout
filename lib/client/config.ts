// Public Firebase web configuration only. Never expose Admin or database secrets.
export const clientConfig = {
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  },
  approvedRepo: process.env.NEXT_PUBLIC_APPROVED_REPO ?? "calcom/cal.diy",
};
export const hasFirebaseConfig = Object.values(clientConfig.firebase).every(Boolean);
