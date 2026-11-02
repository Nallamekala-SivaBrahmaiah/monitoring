import fs from 'fs';
import path from 'path';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import Alert from '@/models/Alert';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'cloud_storage.json');

interface FileStore {
  accounts: any[];
  resources: any[];
  alerts: any[];
}

function getFileStore(): FileStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Storage] File read error:', e);
  }
  return { accounts: [], resources: [], alerts: [] };
}

function saveFileStore(store: FileStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Storage] File write error:', e);
  }
}

let isMongoAvailable: boolean | null = null;

async function checkMongo(): Promise<boolean> {
  if (isMongoAvailable === true) return true;
  try {
    const conn = await connectToDatabase();
    isMongoAvailable = conn.connection.readyState === 1;
    return isMongoAvailable;
  } catch (err: any) {
    if (isMongoAvailable !== false) {
      console.warn(
        `[Storage] MongoDB not connected (${err.message || 'ECONNREFUSED'}). Using persistent local file storage fallback.`
      );
    }
    isMongoAvailable = false;
    return false;
  }
}

// -----------------------------------------------------------------------------
// Cloud Account Storage
// -----------------------------------------------------------------------------
export async function upsertAccount(data: any): Promise<any> {
  // Always mirror to local file store for persistent fallback
  const store = getFileStore();
  const existingIdx = store.accounts.findIndex(
    (a) =>
      a.provider === data.provider &&
      ((data.subscriptionId && a.subscriptionId === data.subscriptionId) ||
        (data.accountId && a.accountId === data.accountId))
  );

  const accountRecord = {
    _id: existingIdx >= 0 ? store.accounts[existingIdx]._id : `acc-${Date.now()}`,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    store.accounts[existingIdx] = accountRecord;
  } else {
    store.accounts.push(accountRecord);
  }
  saveFileStore(store);

  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const filter = data.subscriptionId
        ? { provider: data.provider, subscriptionId: data.subscriptionId }
        : { provider: data.provider, accountId: data.accountId };
      return await CloudAccount.findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    } catch (e) {
      console.warn('[Storage] Mongo upsert failed, mirrored to local file storage');
    }
  }

  return accountRecord;
}

export async function fetchAccounts(provider?: string): Promise<any[]> {
  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const q: any = {};
      if (provider && provider !== 'all') q.provider = provider;
      const mongoList = await CloudAccount.find(q).lean();
      if (mongoList && mongoList.length > 0) {
        return mongoList;
      }
    } catch {
      // Fallback
    }
  }

  const store = getFileStore();
  let list = store.accounts;
  if (provider && provider !== 'all') {
    list = list.filter((a) => a.provider === provider);
  }
  return list;
}

export async function removeAccount(provider: string, identifier: string): Promise<void> {
  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      await CloudAccount.deleteMany({
        provider: provider as any,
        $or: [{ subscriptionId: identifier }, { accountId: identifier }, { _id: identifier as any }],
      });
      await CloudResource.deleteMany({
        provider: provider as any,
        $or: [{ subscriptionId: identifier }, { accountId: identifier }],
      });
    } catch {
      //
    }
  }

  const store = getFileStore();
  store.accounts = store.accounts.filter(
    (a) =>
      !(
        a.provider === provider &&
        (a.subscriptionId === identifier || a.accountId === identifier || a._id === identifier)
      )
  );
  store.resources = store.resources.filter(
    (r) =>
      !(
        r.provider === provider &&
        (r.subscriptionId === identifier || r.accountId === identifier)
      )
  );
  saveFileStore(store);
}

// -----------------------------------------------------------------------------
// Cloud Resource Storage
// -----------------------------------------------------------------------------
export async function bulkUpsertResources(resources: any[]): Promise<void> {
  if (resources.length === 0) return;

  // Always mirror to local file store
  const store = getFileStore();
  const resMap = new Map<string, any>();
  for (const r of store.resources) {
    resMap.set(`${r.provider}:${r.resourceId}`, r);
  }
  for (const r of resources) {
    resMap.set(`${r.provider}:${r.resourceId}`, {
      _id: r._id || `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...r,
      updatedAt: new Date().toISOString(),
    });
  }
  store.resources = Array.from(resMap.values());
  saveFileStore(store);

  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const bulkOps = resources.map((r) => ({
        updateOne: {
          filter: { resourceId: r.resourceId, provider: r.provider },
          update: { $set: r },
          upsert: true,
        },
      }));
      await CloudResource.bulkWrite(bulkOps as any);
      return;
    } catch (e) {
      console.warn('[Storage] Mongo bulk write failed, mirrored to local file store');
    }
  }
}

export async function fetchResources(query: {
  provider?: string | null;
  resourceType?: string | null;
  region?: string | null;
  subscriptionId?: string | null;
  accountId?: string | null;
  search?: string | null;
}): Promise<any[]> {
  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const mongoQ: any = {
        isDeleted: { $ne: true },
        status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
      };
      if (query.provider && query.provider !== 'all') mongoQ.provider = query.provider;
      if (query.resourceType && query.resourceType !== 'all') mongoQ.resourceType = query.resourceType;
      if (query.region && query.region !== 'all') mongoQ.region = query.region;
      if (query.subscriptionId && query.subscriptionId !== 'all') mongoQ.subscriptionId = query.subscriptionId;
      if (query.accountId && query.accountId !== 'all') mongoQ.accountId = query.accountId;
      if (query.search) {
        mongoQ.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { resourceId: { $regex: query.search, $options: 'i' } },
        ];
      }
      const mongoResults = await CloudResource.find(mongoQ).sort({ updatedAt: -1 }).limit(200).lean();
      if (mongoResults && mongoResults.length > 0) {
        return mongoResults;
      }
    } catch {
      //
    }
  }

  const store = getFileStore();
  let list = store.resources.filter((r) => !r.isDeleted && !['Terminated', 'terminated', 'deleted', 'Deleted'].includes(r.status));
  if (query.provider && query.provider !== 'all') {
    list = list.filter((r) => r.provider === query.provider);
  }
  if (query.resourceType && query.resourceType !== 'all') {
    list = list.filter((r) => r.resourceType === query.resourceType);
  }
  if (query.region && query.region !== 'all') {
    list = list.filter((r) => r.region?.toLowerCase() === query.region?.toLowerCase());
  }
  if (query.subscriptionId && query.subscriptionId !== 'all') {
    list = list.filter((r) => r.subscriptionId === query.subscriptionId);
  }
  if (query.accountId && query.accountId !== 'all') {
    list = list.filter((r) => r.accountId === query.accountId);
  }
  if (query.search) {
    const s = query.search.toLowerCase();
    list = list.filter((r) => r.name?.toLowerCase().includes(s) || r.resourceId?.toLowerCase().includes(s));
  }
  return list;
}

export async function fetchResourceById(id: string): Promise<any | null> {
  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const found = await CloudResource.findOne({
        $or: [{ resourceId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }],
      }).lean();
      if (found) return found;
    } catch {
      //
    }
  }

  const store = getFileStore();
  return store.resources.find((r) => r.resourceId === id || r._id === id) || null;
}
