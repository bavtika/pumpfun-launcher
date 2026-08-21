# RunPod GPU vanity worker

Serverless GPU worker for vanity Solana contract addresses (4–6 char patterns).
Wraps [SolVanityCL](https://github.com/WincerChan/SolVanityCL) (OpenCL, prefix + suffix)
in a RunPod serverless handler.

## Deploy

1. Build and push the image (needs a public registry — RunPod pulls from one):

   ```bash
   docker build -t <your-dockerhub>/sol-vanity-worker:latest runpod-worker/
   docker push <your-dockerhub>/sol-vanity-worker:latest
   ```

2. RunPod console → **Serverless → New Endpoint**:
   - Template: custom Docker image `<your-dockerhub>/sol-vanity-worker:latest`
   - GPU: any NVIDIA with ≥ 16 GB VRAM works (RTX 3090/4090, A4000+ are the sweet spot)
   - **Job Timeout**: raise it — a 6-char pattern can take hours. Set ≥ `WORKER_TIMEOUT_S` (default 3 h)
   - (optional) env `WORKER_TIMEOUT_S` to change the internal cap
   - GPU count / workers: 1 is fine

3. Point the launcher server at it:

   ```bash
   RUNPOD_ENDPOINT_ID=<endpoint id> RUNPOD_API_KEY=<runpod api key> npm run dev
   ```

## API contract

`POST /run` input: `{ "pattern": "pump", "match": "prefix" | "suffix" }` → `{ "id": "<jobId>" }`
`GET /status/<jobId>` output on completion: `{ "address": "<base58>", "secretKey": "<base58 64-byte>" }`

## Security note

The keypair is generated on RunPod infrastructure — that's inherent to serverless
GPU grinding. This is acceptable for a **token mint address** (the mint keypair holds
no funds after deploy), but never reuse a generated keypair as a regular wallet.
