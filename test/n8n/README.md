# Local n8n Package Test

This setup builds the package from the current source, installs the generated tarball in n8n
2.34.5, and exposes n8n only on localhost. The package's `n8n-workflow` peer resolves to the copy
provided by n8n instead of installing a duplicate version.

Start or rebuild the test instance:

```sh
docker compose -f test/n8n/compose.yml up --build -d
```

Open `http://localhost:5678`, complete the local owner setup, and verify that **Vtiger Open Source** is
available. Import `examples/list-accessible-modules.workflow.json`, assign a dedicated test
credential, and execute the workflow.

Check the container and installed package:

```sh
docker compose -f test/n8n/compose.yml ps
docker compose -f test/n8n/compose.yml exec n8n npm ls --prefix /home/node/.n8n/nodes --depth=0
```

Stop n8n while preserving local workflows and credentials:

```sh
docker compose -f test/n8n/compose.yml down
```

After rebuilding the image, an existing volume still contains the previously installed package.
Update it from the rebuilt image before restarting:

```sh
docker compose -f test/n8n/compose.yml build n8n
docker compose -f test/n8n/compose.yml run --rm --no-deps --entrypoint sh n8n -c "npm install --prefix /home/node/.n8n/nodes --omit=dev --omit=peer /opt/n8n-nodes-vtiger-oss.tgz"
docker compose -f test/n8n/compose.yml up -d
```

To reset everything, including workflows, credentials, and the generated encryption key, run
`docker compose -f test/n8n/compose.yml down --volumes`. This permanently deletes the local n8n
test data.
