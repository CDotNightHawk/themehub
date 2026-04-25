import { promises as fs } from "node:fs";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Storage {
  put(key: string, body: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  url(key: string): Promise<string>;
}

class LocalStorage implements Storage {
  constructor(private readonly root: string) {}

  private full(key: string) {
    const safe = key.replace(/^\/+/, "").replace(/\.\./g, "");
    return path.join(this.root, safe);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.full(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.full(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.full(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async url(key: string): Promise<string> {
    // Served by /api/files/[...path] — see app/api/files/[...path]/route.ts
    return `/api/files/${key.replace(/^\/+/, "")}`;
  }
}

class S3Storage implements Storage {
  private readonly client: S3Client;
  constructor(
    private readonly bucket: string,
    endpoint: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    forcePathStyle: boolean,
  ) {
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!out.Body) throw new Error(`empty body for ${key}`);
    const reader = (out.Body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.length;
    }
    return Buffer.from(buf);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async url(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 60 * 60 },
    );
  }
}

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    cached = new S3Storage(
      requireEnv("S3_BUCKET"),
      requireEnv("S3_ENDPOINT"),
      process.env.S3_REGION ?? "us-east-1",
      requireEnv("S3_ACCESS_KEY_ID"),
      requireEnv("S3_SECRET_ACCESS_KEY"),
      (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
    );
  } else {
    cached = new LocalStorage(
      path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage"),
    );
  }
  return cached;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  return v;
}

export function isLocalStorage(): boolean {
  return (process.env.STORAGE_DRIVER ?? "local") === "local";
}

export function localStorageDir(): string {
  return path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
}
