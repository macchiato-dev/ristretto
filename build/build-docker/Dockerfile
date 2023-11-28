FROM denoland/deno:bin as deno

FROM node:bookworm-slim

COPY --from=deno /deno /bin/deno
