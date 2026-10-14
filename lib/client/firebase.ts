import { getApps, initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { clientConfig, hasFirebaseConfig } from "./config";
export function clientAuth() {
  if (!hasFirebaseConfig) return null;
  return getAuth(getApps()[0] ?? initializeApp(clientConfig.firebase));
}
