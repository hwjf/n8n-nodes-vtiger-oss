# n8n-nodes-vtiger-oss

An n8n community node for Vtiger CRM Open Source 8.x. It gives workflows authenticated access to
Vtiger's webservice API with dedicated actions for records, documents, relations, VTQL queries,
module metadata, and lead conversion.

The package targets n8n 2.x and Node.js 22.22 or 24. Loading of the packaged node is tested against
n8n 2.34.5. Core read operations have been verified on fresh Vtiger 8.0 through 8.4 installations;
known limitations are listed under [Compatibility](#compatibility).

## Resources and Operations

The names below match what you see in n8n.

| Resource           | Operations                                                                              |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Advanced**       | Custom GET, Custom POST                                                                 |
| **Document**       | Download Attachment, Upload, Upload and Link to Record                                  |
| **Lead**           | Convert                                                                                 |
| **Module**         | Describe Module, List Accessible Modules                                                |
| **Query**          | Guided VTQL Query, Raw VTQL Query                                                       |
| **Record**         | Create, Delete, Full Update, Retrieve, Update Fields                                    |
| **Related Record** | Add Related Record, List Related Types, Query Related Records, Retrieve Related Records |

Records are referenced by their full Vtiger webservice ID in the form
`<entity-type-prefix>x<record-number>`, for example `11x123`. The prefix depends on the
installation, and the plain numeric ID from a CRM URL is not enough. A few inventory fields are
exceptions – `currency_id`, for instance, usually takes the internal numeric currency ID. When in
doubt, check the module metadata or an existing record in your installation.

### Record Operations

**Record** covers generic CRUD for any module the API user can access, including inventory modules
as long as you supply the full payload the installation expects.

- **Update Fields** uses Vtiger's `revise` operation. Only the fields you send are changed;
  everything else stays as it is.
- **Full Update** uses Vtiger's `update` operation. You must send every mandatory field and every
  value you want to keep.

Use **Update Fields** unless you specifically need the full-update behavior.
After a successful **Delete**, the node returns `{ "deleted": true }`.

### Output

Actions that return records or metadata provide three output modes:

- **Simplified** is the default. It returns up to ten top-level fields and prioritizes common
  identity fields such as `id`, names, labels, and email addresses.
- **Raw** returns every top-level field provided by Vtiger.
- **Selected Fields** returns only the comma-separated top-level fields you request.

Each record in a list remains a separate n8n item. File downloads and action confirmations are not
filtered by these modes.

### Quotes, Invoices, Sales Orders, and Purchase Orders

These modules work with the normal **Record** operations. **Retrieve** returns the `LineItems`
collection. **Update Fields** keeps existing line items when `LineItems` is omitted and replaces
them when a non-empty collection is supplied.

Vtiger also registers a `retrieve_inventory` operation, but it returns nothing beyond the regular
`retrieve`. When updating a record in a foreign currency, include its current `conversion_rate` –
otherwise Vtiger's inventory handler may fall back to `1`.

A Quote create payload typically looks like this:

```json
{
	"subject": "Example Quote",
	"quotestage": "Created",
	"account_id": "11x123",
	"assigned_user_id": "19x1",
	"currency_id": "1",
	"conversion_rate": "1",
	"hdnTaxType": "group",
	"productid": "14x456",
	"quantity": "1",
	"listprice": "100.00",
	"LineItems": [
		{
			"productid": "14x456",
			"quantity": "1",
			"listprice": "100.00",
			"discount_percent": "0",
			"discount_amount": "0",
			"comment": "Example line item"
		}
	]
}
```

Treat this as a structural example rather than a ready-to-run payload. Use **Describe Module** to
get the actual field list, and take IDs, picklist values, currencies, taxes, custom fields, and any
further mandatory fields from your installation. The parent-level `productid`, `quantity`, and
`listprice` are the minimum; some installations also expect the first line item's comment,
discounts, taxes, purchase cost, margin, or other values at parent level.

### Lead Conversion

Vtiger creates the selected Account, Contact, and Potential one after another. If a later step
fails, the records created before it remain while the Lead stays unconverted. A missing required
Potential field, for example, can leave behind a Contact that was already created.

### VTQL Queries

Both query operations run VTQL `SELECT` statements with offset-based pagination.

- **Guided VTQL Query** builds `SELECT *`, `FROM`, `WHERE`, and `ORDER BY` from separate fields.
  Enter the condition only, without the `WHERE` keyword.
- **Raw VTQL Query** takes the complete `SELECT` statement.

Control the result size with **Limit** or **Return All**. The node turns these settings into the
`LIMIT` clause, so leave `LIMIT` out of the raw query text. Queries that need more than one API
request must have a stable `ORDER BY`, and records changing mid-query can still affect offset-based
results.

### Documents and Attachments

**Upload** creates a `Documents` record with an internally stored file. **Upload and Link to
Record** creates the document first and then relates it to an existing record. If linking fails,
the document is kept and its ID is included in the error message so you can clean up.

Vtiger uses two different identifiers here:

- The Document ID (`result.id`) is used for retrieval, deletion, and relations.
- The Attachment Download ID (`imageattachmentids`) is used by **Download Attachment** via
  `files_retrieve`.

Downloads are returned as n8n binary data. The aggregate download limit is configurable, defaults
to 25 MB, and is capped at 100 MB.

### Related Records

Start with **List Related Types** to get the exact related module and related-list label the
installation expects, then use that label with the other operations:

- **Retrieve Related Records** returns a related list for a parent record.
- **Query Related Records** runs a VTQL query within a related list. An optional `LIMIT` clause is
  passed through to Vtiger as-is; there is no automatic pagination.
- **Add Related Record** links two existing records.

Vtiger has no standard webservice operation for removing a relation, so the node does not offer
one.

### Advanced Operations

**Custom GET** and **Custom POST** call any operation registered in the Vtiger installation. The
node protects the internally managed operation and session parameters, but the operations
themselves are not allowlisted and can change or delete data.

## Installation

Install `n8n-nodes-vtiger-oss` from **Settings > Community Nodes** in n8n. For a manual
self-hosted installation, run this inside `~/.n8n/nodes`:

```sh
npm install n8n-nodes-vtiger-oss
```

Restart n8n, add the **Vtiger Open Source API** credential, and select **Vtiger Open Source** in a
workflow.

## Credentials

Create a dedicated Vtiger API user with only the permissions your workflows need. Enter the
installation base URL, the username, and the access key from the user's Vtiger preferences – not
the account password.

HTTPS is required by default. **Allow Insecure HTTP** exists only for isolated local test systems
and should never be enabled on production credentials. n8n stores the access key in its encrypted
credential store.

When the node is used as an AI tool, the generic Record actions can create, update, and delete data
within the API user's permissions. Keep that user least-privilege and only expose mutating tools
where the workflow actually needs them.

## Compatibility

Compatibility is operation-specific. Fresh-install probes confirmed login, module metadata,
relation metadata, and ordered VTQL queries on Vtiger 8.0 through 8.4; targeted integration tests
cover further read behavior. Newer Vtiger 8.x releases are not assumed to work without testing.
The lab setup, probe generator, and retained matrix results are available in
[hwjf/vtiger-oss-lab](https://github.com/hwjf/vtiger-oss-lab).

### Fresh Installations

| Vtiger version | Status                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| 8.0 – 8.3      | Core read probes pass; `files_retrieve` is broken under PHP 8           |
| 8.4            | Core read probes pass; `files_retrieve` handler signature is compatible |

- Fresh 8.0 through 8.3 installations register `files_retrieve` with an `id` parameter while the
  PHP handler expects `$file_id`. Vtiger 8.4 fixes this.
- Lead conversion requires the current registration with a single encoded `element` parameter.

### Upgraded Installations

An upgraded installation can behave differently from a fresh one reporting the same version.
Database registrations and old customizations may survive several upgrades even after the PHP
handlers have changed. One example seen in practice is an obsolete five-parameter `convertlead`
registration.

## Example

A read-only workflow you can import is available at
[`examples/list-accessible-modules.workflow.json`](https://github.com/hwjf/n8n-nodes-vtiger-oss/blob/main/examples/list-accessible-modules.workflow.json).
Import it, assign your **Vtiger Open Source API** credential, and run it manually.

## Development

Clone the repository, then:

```sh
npm ci
npm run format:check
npm run lint
npm test
npm run test:coverage
npm run build
```

`npm run dev` loads the package into a local n8n development instance.

For integration tests, copy
[`.env.example`](https://github.com/hwjf/n8n-nodes-vtiger-oss/blob/main/.env.example) to `.env`,
enter the credentials of a dedicated Vtiger test user, and run `npm run test:integration`.
Optional record and attachment IDs enable additional read tests. Mutating tests require separate
explicit flags and an isolated test instance – never point them at production.

There is also a
[packaged-node smoke test](https://github.com/hwjf/n8n-nodes-vtiger-oss/tree/main/test/n8n) that
builds the package, installs it into n8n 2.34.5, and verifies that the node loads against n8n's
own `n8n-workflow` installation.

## Troubleshooting

- **Credential test fails:** Enter the base URL without `/webservice.php`, double-check the access
  key, and use HTTPS.
- **Invalid record ID:** Use the full webservice ID returned by Vtiger or this node, not the
  numeric ID from a CRM URL.
- **Permission to perform the operation is denied:** Make sure the module is active and the API
  user can access the module, the record, any referenced users, and all related modules involved.
  Vtiger also returns this message when a module such as Leads is disabled.
- **HTTP 500 on attachments or lead conversion:** See the compatibility notes and check the
  `vtiger_ws_operation` table. Upgraded installations can carry incompatible registrations.
- **A query stops at 100 records:** Enable **Return All** or raise **Limit**. The node converts
  this into the `LIMIT` clause; multi-page queries also need an `ORDER BY`.
- **Execution continues after an item error:** Disable n8n's **Continue On Fail** if the workflow
  should stop at the first failed item.
- **Local development fails on Node 23:** Use Node.js 22.22 LTS or 24. Odd-numbered Node.js
  releases are not supported by the toolchain.

## Trademarks

Vtiger and the Vtiger logo are trademarks of their respective owner and are used here only to
indicate compatibility with Vtiger CRM. This is an independent community project and is not
affiliated with or endorsed by Vtiger.

## License

[MIT](https://github.com/hwjf/n8n-nodes-vtiger-oss/blob/main/LICENSE)
