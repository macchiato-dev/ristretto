# Build - Docker

This sets up a Docker image with Deno and docker:

`Dockerfile`

```
FROM denoland/deno:bin as deno

FROM node:bookworm-slim

COPY --from=deno /deno /bin/deno
```

Currently deno's Docker images don't support ARM.

To build and run on an x86 system:

```bash
docker build -t ristretto-deno-node .
docker run -it ristretto-deno-node sh
```

To build and run on a system that defaults to ARM but supports x86:

```bash
docker build --platform linux/amd64 -t ristretto-deno-node .
docker run --platform linux/amd64 -it ristretto-deno-node sh
```
