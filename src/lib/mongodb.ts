import mongoose from 'mongoose';
import dns from 'dns';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/monitoring';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

function ensureDnsForSrv(uri: string) {
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // ignore
    }
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const currentUri = process.env.MONGODB_URI || MONGODB_URI;

  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  ensureDnsForSrv(currentUri);

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose
      .connect(currentUri, opts)
      .then((mongooseInstance) => {
        console.log(
          `[MongoDB] Connected successfully to ${currentUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`
        );
        // Eagerly bootstrap autonomous background monitoring scheduler
        try {
          const { startMonitoringScheduler } = require('@/lib/monitoring/scheduler');
          startMonitoringScheduler();
        } catch {
          // scheduler init non-blocking
        }
        return mongooseInstance;
      })
      .catch((err) => {
        if (err.message && err.message.includes('querySrv') && currentUri.startsWith('mongodb+srv://')) {
          console.warn('[MongoDB] querySrv failed, retrying with Google DNS...');
          try {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
          } catch {}
          return mongoose.connect(currentUri, opts);
        }
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
