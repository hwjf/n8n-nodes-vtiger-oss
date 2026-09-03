# syntax=docker/dockerfile:1

FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS builder

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm pack --pack-destination /tmp

FROM ghcr.io/n8n-io/n8n:2.34.5@sha256:d91033b4fac2f7b75c5c4007e10824c66147f7d7a3cccb488720e97452ee7dc7

ENV NODE_PATH=/usr/local/lib/node_modules/n8n/node_modules:/usr/local/lib/node_modules

COPY --from=builder --chown=node:node \
	/tmp/n8n-nodes-vtiger-oss-*.tgz \
	/opt/n8n-nodes-vtiger-oss.tgz

RUN mkdir -p /home/node/.n8n/nodes && \
	npm install --prefix /home/node/.n8n/nodes --omit=dev --omit=peer /opt/n8n-nodes-vtiger-oss.tgz
