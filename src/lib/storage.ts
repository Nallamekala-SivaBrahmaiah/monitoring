import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import Server from '@/models/Server';
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
  const isMongoValidId = mongoose.Types.ObjectId.isValid(identifier);
  const cleanId = identifier.replace(/^acc-aws-|^sub-|^reg-/, '');

  // 1. Resolve all aliases (subscriptionId, accountId, _id)
  let subId = cleanId;
  let accId = cleanId;
  let objId: mongoose.Types.ObjectId | null = isMongoValidId ? new mongoose.Types.ObjectId(identifier) : null;

  // Check file store to resolve all aliases
  const store = getFileStore();
  const existingAcc = store.accounts.find(
    (a) =>
      (provider === 'all' || a.provider === provider) &&
      (a.subscriptionId === identifier ||
        a.subscriptionId === cleanId ||
        a.accountId === identifier ||
        a.accountId === cleanId ||
        a._id === identifier ||
        a.id === identifier)
  );

  if (existingAcc) {
    if (existingAcc.subscriptionId) subId = existingAcc.subscriptionId;
    if (existingAcc.accountId) accId = existingAcc.accountId;
    if (existingAcc._id && mongoose.Types.ObjectId.isValid(existingAcc._id)) {
      objId = new mongoose.Types.ObjectId(existingAcc._id);
    }
  }

  // 2. Remove from MongoDB safely without CastError
  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const orFind: any[] = [
        { subscriptionId: identifier },
        { subscriptionId: cleanId },
        { subscriptionId: subId },
        { accountId: identifier },
        { accountId: cleanId },
        { accountId: accId },
      ];
      if (isMongoValidId) orFind.push({ _id: objId });

      const foundInMongo: any = await (CloudAccount as any).findOne({
        ...(provider !== 'all' ? { provider: provider as any } : {}),
        $or: orFind,
      }).lean();

      if (foundInMongo) {
        if (foundInMongo.subscriptionId) subId = foundInMongo.subscriptionId;
        if (foundInMongo.accountId) accId = foundInMongo.accountId;
        if (foundInMongo._id && mongoose.Types.ObjectId.isValid(foundInMongo._id.toString())) {
          objId = new mongoose.Types.ObjectId(foundInMongo._id.toString());
        }
      }

      const allIds = Array.from(new Set([subId, accId, cleanId, identifier].filter(Boolean)));

      const orAccountDelete: any[] = [
        ...allIds.map((id) => ({ subscriptionId: id })),
        ...allIds.map((id) => ({ accountId: id })),
      ];
      if (objId) {
        orAccountDelete.push({ _id: objId });
      }

      await (CloudAccount as any).deleteMany({
        ...(provider !== 'all' ? { provider: provider as any } : {}),
        $or: orAccountDelete,
      });

      // Cascade delete from CloudResource (EC2, VMs, disks, NICs, public IPs)
      await (CloudResource as any).deleteMany({
        ...(provider !== 'all' ? { provider: provider as any } : {}),
        $or: [
          ...allIds.map((id) => ({ subscriptionId: id })),
          ...allIds.map((id) => ({ accountId: id })),
        ],
      });

      // Cascade delete from Server collection (any registered instances from this account)
      try {
        const Server = (await import('@/models/Server')).default;
        await (Server as any).deleteMany({
          $or: [
            ...allIds.map((id) => ({ cloudResourceId: { $regex: id, $options: 'i' } })),
            ...allIds.map((id) => ({ instanceId: { $regex: id, $options: 'i' } })),
            ...(provider !== 'all' ? [{ cloudProvider: provider }] : []),
          ],
        });
      } catch (srvErr) {
        console.warn('[Storage] Server cascade delete note:', srvErr);
      }

      // Check if any other connected account exists for this provider
      const remainingAccounts = await (CloudAccount as any).countDocuments({
        provider: provider as any,
        status: 'Connected',
        accountId: { $nin: allIds },
        subscriptionId: { $nin: allIds },
      });

      if (remainingAccounts === 0 && provider !== 'all') {
        // Zero remaining accounts for this provider! Completely purge all resources & servers for this cloud
        await (CloudResource as any).deleteMany({ provider: provider as any });
        try {
          const Server = (await import('@/models/Server')).default;
          await (Server as any).deleteMany({ cloudProvider: provider });
        } catch { }
      }

      // Cascade delete related alerts
      try {
        const Alert = (await import('@/models/Alert')).default;
        await (Alert as any).deleteMany({
          ...(provider !== 'all' ? { provider: provider as any } : {}),
        });
      } catch { }


    } catch (err) {
      console.error('[Storage] MongoDB removeAccount error:', err);
    }
  }

  // 3. Remove from local file store
  const allIds = Array.from(new Set([subId, accId, cleanId, identifier].filter(Boolean)));

  store.accounts = store.accounts.filter((a) => {
    if (provider !== 'all' && a.provider !== provider) return true;
    if (a.subscriptionId && allIds.includes(a.subscriptionId)) return false;
    if (a.accountId && allIds.includes(a.accountId)) return false;
    if (a._id && (allIds.includes(a._id) || (objId && a._id === objId.toString()))) return false;
    if (a.id && (allIds.includes(a.id) || (objId && a.id === objId.toString()))) return false;
    return true;
  });

  store.resources = store.resources.filter((r) => {
    if (provider !== 'all' && r.provider !== provider) return true;
    if (r.subscriptionId && allIds.includes(r.subscriptionId)) return false;
    if (r.accountId && allIds.includes(r.accountId)) return false;
    return true;
  });

  // If zero remaining accounts in file store for this provider, purge all its resources
  const remainingFileAccounts = store.accounts.filter((a) => (provider === 'all' || a.provider === provider) && a.status === 'Connected');
  if (remainingFileAccounts.length === 0 && provider !== 'all') {
    store.resources = store.resources.filter((r) => r.provider !== provider);
  }

  saveFileStore(store);
}

export async function updateAccountStatus(provider: string, identifier: string, status: string): Promise<void> {
  const isMongoValidId = mongoose.Types.ObjectId.isValid(identifier);
  const hasMongo = await checkMongo();
  if (hasMongo) {
    try {
      const orFind: any[] = [{ subscriptionId: identifier }, { accountId: identifier }];
      if (isMongoValidId) orFind.push({ _id: new mongoose.Types.ObjectId(identifier) });

      await (CloudAccount as any).updateMany(
        {
          ...(provider !== 'all' ? { provider: provider as any } : {}),
          $or: orFind,
        },
        { $set: { status, lastSyncAt: new Date() } }
      );
    } catch (err) {
      console.error('[Storage] MongoDB updateAccountStatus error:', err);
    }
  }

  const store = getFileStore();
  store.accounts = store.accounts.map((a) => {
    if (provider !== 'all' && a.provider !== provider) return a;
    if (a.subscriptionId === identifier || a.accountId === identifier || a._id === identifier || a.id === identifier) {
      return { ...a, status, lastSyncAt: new Date().toISOString() };
    }
    return a;
  });
  saveFileStore(store);
}

// -----------------------------------------------------------------------------
// Cloud Resource Storage
// -----------------------------------------------------------------------------
export async function bulkUpsertResources(resources: any[]): Promise<void> {
  if (resources.length === 0) return;

  // Filter out any resources belonging to disconnected or deleted accounts
  let filteredResources = resources;
  try {
    const hasMongo = await checkMongo();
    if (hasMongo) {
      const connectedAccounts = await (CloudAccount as any).find({ status: 'Connected' }).lean();
      const connectedAwsIds = new Set<string>(
        connectedAccounts
          .filter((a: any) => a.provider === 'aws')
          .flatMap((a: any) => [a.accountId, a._id?.toString(), a.id])
          .filter(Boolean)
      );
      const connectedAzureIds = new Set<string>(
        connectedAccounts
          .filter((a: any) => a.provider === 'azure')
          .flatMap((a: any) => [a.subscriptionId, a._id?.toString(), a.id])
          .filter(Boolean)
      );

      filteredResources = resources.filter((r) => {
        if (r.provider === 'aws') {
          return connectedAwsIds.size > 0 && (!r.accountId || connectedAwsIds.has(r.accountId));
        }
        if (r.provider === 'azure') {
          return connectedAzureIds.size > 0 && (!r.subscriptionId || connectedAzureIds.has(r.subscriptionId));
        }
        return true;
      });
    }
  } catch (chkErr) {
    console.warn('[Storage] bulkUpsertResources account check note:', chkErr);
  }

  if (filteredResources.length === 0) return;

  // Always mirror to local file store
  const store = getFileStore();
  const resMap = new Map<string, any>();
  for (const r of store.resources) {
    resMap.set(`${r.provider}:${r.resourceId}`, r);
  }
  for (const r of filteredResources) {
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
      const bulkOps = filteredResources.map((r) => ({
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
