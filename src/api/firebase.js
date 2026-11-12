import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set, update, push, runTransaction, onValue, query, orderByChild, equalTo, increment } from 'firebase/database';

const env = import.meta.env;
const primaryConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAR98tJfqxO0_LZT7GRn-peOqQB1PgP6D4',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'family-4ff2a.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://family-4ff2a-default-rtdb.firebaseio.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'family-4ff2a',
};
const secondaryConfig = {
  apiKey: env.VITE_SECONDARY_FIREBASE_API_KEY || 'AIzaSyBb61hwCwDMJrV7mhkMWJOA3RhUtu1nYac',
  authDomain: env.VITE_SECONDARY_FIREBASE_AUTH_DOMAIN || 'meshwark-f8b0a.firebaseapp.com',
  databaseURL: env.VITE_SECONDARY_FIREBASE_DATABASE_URL || 'https://meshwark-f8b0a-default-rtdb.firebaseio.com',
  projectId: env.VITE_SECONDARY_FIREBASE_PROJECT_ID || 'meshwark-f8b0a',
  storageBucket: env.VITE_SECONDARY_FIREBASE_STORAGE_BUCKET || 'meshwark-f8b0a.firebasestorage.app',
  messagingSenderId: env.VITE_SECONDARY_FIREBASE_MESSAGING_SENDER_ID || '85412350921',
  appId: env.VITE_SECONDARY_FIREBASE_APP_ID || '1:85412350921:web:5a654ccb3753dc1153b618',
};
const app = getApps().some((item) => item.name === '[DEFAULT]') ? getApp() : initializeApp(primaryConfig);
const secondary = getApps().some((item) => item.name === 'secondary') ? getApp('secondary') : initializeApp(secondaryConfig, 'secondary');
const databases = { primary: getDatabase(app), secondary: getDatabase(secondary) };
export const databaseRef = (path, database = 'primary') => ref(databases[database], path);
export const newKey = (path) => push(databaseRef(path)).key;
export const read = async (path, database) => (await get(databaseRef(path, database))).val();
export const write = (path, value, database) => set(databaseRef(path, database), value);
export const patch = (path, value, database) => update(databaseRef(path, database), value);
export const transaction = (path, transform, database) => runTransaction(databaseRef(path, database), transform, { applyLocally: false });
export const watch = (path, callback, onError, database) => onValue(databaseRef(path, database), (snapshot) => callback(snapshot.val()), onError);
export const findByPhone = async (path, phone) => (await get(query(databaseRef(path), orderByChild('phone'), equalTo(phone)))).val();
export async function create(path, value, database) {
  const item = push(databaseRef(path, database));
  await set(item, value);
  return item.key;
}
export { increment };

export async function saveProfile(phone, changes) {
  const updates = {};
  // Merge fields at their leaf paths so balances and admin flags remain intact.
  for (const collection of ['customers', 'approved_users']) {
    for (const [key, value] of Object.entries(changes)) updates[`${collection}/${phone}/${key}`] = value;
  }
  await Promise.all([patch('/', updates), patch('/', updates, 'secondary')]);
  const registrations = await findByPhone('pending_registrations', phone);
  const registrationUpdates = {};
  for (const id of Object.keys(registrations || {})) {
    for (const [key, value] of Object.entries(changes)) registrationUpdates[`pending_registrations/${id}/${key}`] = value;
    if (changes.area) {
      registrationUpdates[`pending_registrations/${id}/areaUpdatedAt`] = Date.now();
      registrationUpdates[`pending_registrations/${id}/areaUpdatedBy`] = 'customer';
    }
  }
  if (Object.keys(registrationUpdates).length) await patch('/', registrationUpdates);
}
