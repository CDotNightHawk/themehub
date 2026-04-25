import net from "node:net";

// ClamAV INSTREAM client. Connects to a clamd instance over TCP and streams
// the uploaded archive for signature scanning.
//
// Configure via env:
//   CLAMAV_HOST  host (default: "clamav" — matches docker-compose service)
//   CLAMAV_PORT  port (default: 3310)
//   CLAMAV_TIMEOUT_MS  socket timeout (default: 30000)
//
// If `CLAMAV_DISABLED=1` is set or the host is unreachable, scans return
// "skipped" rather than failing closed — self-hosters without clamd still
// work; infrastructure outages don't take the upload pipeline down.

export type ScanResult =
  | { verdict: "clean"; engine: string }
  | { verdict: "infected"; engine: string; signature: string }
  | { verdict: "skipped"; reason: string }
  | { verdict: "error"; reason: string };

const DEFAULT_HOST = "clamav";
const DEFAULT_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 30_000;
// clamd's INSTREAM has a per-chunk and per-stream size limit. Default clamd
// StreamMaxLength is 25 MB, but we send in 64 KiB chunks which is well under
// the per-chunk limit.
const CHUNK_SIZE = 64 * 1024;

function clamavHost(): string {
  return process.env.CLAMAV_HOST ?? DEFAULT_HOST;
}

function clamavPort(): number {
  const raw = process.env.CLAMAV_PORT;
  if (!raw) return DEFAULT_PORT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

function clamavTimeout(): number {
  const raw = process.env.CLAMAV_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function clamavEnabled(): boolean {
  return process.env.CLAMAV_DISABLED !== "1";
}

export async function ping(): Promise<boolean> {
  if (!clamavEnabled()) return false;
  try {
    const reply = await sendCommand("zPING\0");
    return reply.trim().toUpperCase() === "PONG";
  } catch {
    return false;
  }
}

export async function scanBuffer(buf: Buffer): Promise<ScanResult> {
  if (!clamavEnabled()) {
    return { verdict: "skipped", reason: "CLAMAV_DISABLED=1" };
  }
  return new Promise((resolve) => {
    const host = clamavHost();
    const port = clamavPort();
    const sock = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (r: ScanResult) => {
      if (settled) return;
      settled = true;
      try {
        sock.destroy();
      } catch {
        // ignore
      }
      resolve(r);
    };

    sock.setTimeout(clamavTimeout());
    sock.once("timeout", () =>
      finish({ verdict: "error", reason: "clamd timeout" }),
    );
    sock.once("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET"].includes(code)) {
        finish({ verdict: "skipped", reason: `clamd unreachable (${code})` });
      } else {
        finish({ verdict: "error", reason: err.message });
      }
    });
    sock.once("connect", () => {
      sock.write("zINSTREAM\0");
      // Stream in 64 KiB frames: [uint32 BE length][bytes]. Terminator is a
      // zero-length frame.
      for (let off = 0; off < buf.length; off += CHUNK_SIZE) {
        const slice = buf.subarray(off, Math.min(off + CHUNK_SIZE, buf.length));
        const hdr = Buffer.allocUnsafe(4);
        hdr.writeUInt32BE(slice.length, 0);
        sock.write(hdr);
        sock.write(slice);
      }
      const term = Buffer.allocUnsafe(4);
      term.writeUInt32BE(0, 0);
      sock.write(term);
    });
    sock.on("data", (d) => chunks.push(d));
    sock.once("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").replace(/\0/g, "").trim();
      // Typical replies:
      //   "stream: OK"
      //   "stream: Eicar-Test-Signature FOUND"
      //   "stream: ... ERROR"
      const engine = "ClamAV";
      if (/\bOK\b/.test(raw)) {
        return finish({ verdict: "clean", engine });
      }
      const found = raw.match(/stream:\s*(.+?)\s+FOUND/i);
      if (found) {
        return finish({
          verdict: "infected",
          engine,
          signature: found[1].trim(),
        });
      }
      finish({ verdict: "error", reason: raw || "empty reply" });
    });
  });
}

async function sendCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({
      host: clamavHost(),
      port: clamavPort(),
    });
    const chunks: Buffer[] = [];
    sock.setTimeout(clamavTimeout());
    sock.once("timeout", () => {
      sock.destroy();
      reject(new Error("timeout"));
    });
    sock.once("error", reject);
    sock.once("connect", () => sock.write(cmd));
    sock.on("data", (d) => chunks.push(d));
    sock.once("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8").replace(/\0/g, "")),
    );
  });
}
