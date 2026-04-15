import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();
const app = express();
app.use(express.json());

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ORGANIZATION_ID,
  ZOHO_TOKEN_URL
} = process.env;

/* ------------------------------------------------
   1. Refresh Zoho Access Token
------------------------------------------------ */
const getAccessToken = async () => {
  try {
    const response = await axios.post(
      `${ZOHO_TOKEN_URL}`,
      null,
      {
        params: {
          refresh_token: ZOHO_REFRESH_TOKEN,
          client_id: ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          grant_type: "refresh_token"
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error refreshing token:", error.response?.data || error.message);
    throw error;
  }
};

/* ------------------------------------------------
   2. Create Customer
------------------------------------------------ */
app.post("/fr/create-customer", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    /* -------- GET ZOHO CURRENCIES -------- */

    const currencyResp = await axios.get(
      "https://www.zohoapis.com/books/v3/settings/currencies",
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    const currencies = currencyResp.data.currencies;

    const currencyObj = currencies.find(
      c => c.currency_code === req.body.currency
    );

    if (!currencyObj) {
      return res.status(400).json({
        error: `Currency ${req.body.currency} not found in Zoho`
      });
    }

    const currency_id = currencyObj.currency_id;

    const payment_terms = req.body.payment_terms ?? 30;
    const payment_terms_label = req.body.payment_terms_label ?? "Net 30";

    const response = await axios.post(
      "https://www.zohoapis.com/books/v3/contacts",
      {
        contact_name: req.body.contact_name,
        company_name: req.body.company_name,
        contact_type: "customer",
        currency_id: currency_id,
        tax_treatment: req.body.tax_treatment,
        payment_terms: payment_terms, // No. of Days
        payment_terms_label: payment_terms_label, // Name of Payment Terms
        place_of_contact: req.body.place_of_contact,
        tax_reg_no: req.body.tax_reg_no,
        vat_reg_no: req.body.vat_reg_no,
        billing_address: {
          address: req.body.billing_address?.address,
          city: req.body.billing_address?.city,
          zip: req.body.billing_address?.zip,
          country: req.body.billing_address?.country,
        },
        contact_persons: [
          {
            first_name: req.body.contact_name,
            email: req.body.email,
            phone: req.body.phone,
          }
        ],
      },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("❌ Create customer error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

/* ------------------------------------------------
   3. Create Vendor
------------------------------------------------ */
app.post("/fr/create-vendor", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    /* -------- GET ZOHO CURRENCIES -------- */

    const currencyResp = await axios.get(
      "https://www.zohoapis.com/books/v3/settings/currencies",
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    const currencies = currencyResp.data.currencies;

    const currencyObj = currencies.find(
      c => c.currency_code === req.body.currency
    );

    if (!currencyObj) {
      return res.status(400).json({
        error: `Currency ${req.body.currency} not found in Zoho`
      });
    }

    const currency_id = currencyObj.currency_id;

    const payment_terms = req.body.payment_terms ?? 30;
    const payment_terms_label = req.body.payment_terms_label ?? "Net 30";

    const response = await axios.post(
      "https://www.zohoapis.com/books/v3/contacts",
      {
        contact_name: req.body.contact_name,
        company_name: req.body.company_name,
        contact_type: "vendor",
        currency_id: currency_id,
        payment_terms: payment_terms,
        payment_terms_label: payment_terms_label,
        tax_treatment: req.body.tax_treatment,
        place_of_contact: req.body.place_of_contact,
        tax_reg_no: req.body.tax_reg_no,
        vat_reg_no: req.body.vat_reg_no,
        country_code: req.body.country_code,
        billing_address: {
          address: req.body.billing_address?.address,
          city: req.body.billing_address?.city,
          zip: req.body.billing_address?.zip,
          country: req.body.billing_address?.country,
        },
        contact_persons: [
          {
            first_name: req.body.contact_name,
            email: req.body.email,
            phone: req.body.phone,
          }
        ],
      },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("❌ Create vendor error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

/*-------------------------------------------------
    4. Create Invoice
-------------------------------------------------*/

app.post("/fr/create-invoice", async (req, res) => {
  try {

    const bubble_invoice_id = req.body.bubble_invoice_id;
    const customer_id = req.body.customer_id;
    const version = req.body.version || "live";

    const accessToken = await getAccessToken();
    const BASE_URL = version === "test" ? process.env.ULTRASTRATEGY_TEST_API_BASE : process.env.ULTRASTRATEGY_API_BASE;

    /* ---------------- FETCH INVOICE ---------------- */

    const invoiceResp = await axios.get(
      `${BASE_URL}/obj/invoices/${bubble_invoice_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ULTRASTRATEGY_API_KEY}`
        }
      }
    );

    const invoice = invoiceResp.data.response;

    const projectId = invoice.project;
    const timesheetMonth = invoice.TimesheetMonth;

    /* ---------------- FETCH PROJECT ---------------- */

    const projectResp = await axios.get(
      `${BASE_URL}/obj/project/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ULTRASTRATEGY_API_KEY}`
        }
      }
    );

    const project = projectResp.data.response;

    /* ---------------- TAX LOGIC ---------------- */

const vatLineClient = project["VATline - Client"];
let isReverseCharge = false;
let tax_id = null;

if (vatLineClient === "Yes") {

  // ✅ EU B2B Reverse Charge
  isReverseCharge = true;
  tax_id = "7703978000000109088";

} else {

  // VATline = No
  isReverseCharge = false;

  const taxStatus = project["OS.TAX.status (client)"];
  const vatPercentage = Number(project["VATpercentage (client)"]) || 0;

  if (taxStatus === "VAT applicable") {

    if (vatPercentage === 20) {
      // ✅ Standard VAT (20%)
      tax_id = "7703978000000109057";
    } else {
      // ✅ Zero Rated (0%)
      tax_id = "7703978000000109136";
    }

  } else {

    // ✅ No Tax → Zero Rated
    tax_id = "7703978000000109136";

  }
}

    /* ---------------- GET ZOHO ITEMS ---------------- */

    const itemsResp = await axios.get(
      "https://www.zohoapis.com/books/v3/items",
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID
        }
      }
    );

    const itemMap = {};

    itemsResp.data.items.forEach(i => {
      itemMap[i.name.toLowerCase()] = i;
    });

    const DEFAULT_ITEM = itemsResp.data.items[0];

    /* ---------------- PARSE LINE ITEMS ---------------- */

    const rawItems = invoice["invoice_item_list - client"];

    const line_items = rawItems.map(row => {

      const [name, desc1, desc2, numbers] = row.split("|").map(s => s.trim());

      const nums = numbers.split(":").filter(Boolean).map(Number);

      const qty = nums[0] || 1;
      const rate = nums[1] || 0;

      const description = `${desc1} | ${desc2}`;

      const zohoItem = itemMap[name.toLowerCase()] || DEFAULT_ITEM;

      return {
        name,
        description,
        quantity: qty,
        rate,
        ...( tax_id ? { tax_id } : {} )
      };

    });

    /* ---------------- CREATE ZOHO INVOICE ---------------- */

    const invoiceBody = {

      customer_id,
      invoice_number: invoice.invoice_number,
      reference_number: invoice.invoice_number,
      date: invoice.issue_date.split("T")[0],
      due_date: invoice.due_date.split("T")[0],
      currency_code: invoice["os.currency"],
      line_items,
      is_reverse_charge_applied: isReverseCharge,

      custom_fields: [
        {
          customfield_id: "7703978000000117023",
          value: bubble_invoice_id
        }
      ]
    };

    const createResp = await axios.post(
      "https://www.zohoapis.com/books/v3/invoices",
      invoiceBody,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID
        }
      }
    );

    const zohoInvoiceId = createResp.data.invoice.invoice_id;

    console.log("Invoice created:", invoice.invoice_number);

    const invoiceType = invoice["OS.invoice.type"];

    /* ---------------- ATTACHMENT ---------------- */

    const fileResp = await axios.post(
      "https://n8n.anqa.it/webhook/ea7f7d6d-e9bd-45fe-8612-e61e62b1fd98",
      {
        timesheetmonth: timesheetMonth,
        type: invoiceType,
        project: projectId,
        version: version
      },
      {
        responseType: "arraybuffer"
      }
    );

    const formData = new FormData();

    formData.append("attachment", fileResp.data, {
      filename: `${invoice.invoice_number}.pdf`,
      contentType: "application/pdf"
    });

    await axios.post(
      `https://www.zohoapis.com/books/v3/invoices/${zohoInvoiceId}/attachment`,
      formData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          ...formData.getHeaders()
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID
        }
      }
    );

    console.log("Attachment uploaded");

    res.json({
      success: true,
      zoho_invoice_id: zohoInvoiceId
    });

  } catch (err) {

    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Invoice creation failed",
      details: err.response?.data || err.message
    });

  }
});


/*-------------------------------------------------
    5. Create Bill
-------------------------------------------------*/

app.post("/fr/create-bill", async (req, res) => {
  try {

    const bubble_invoice_id = req.body.bubble_invoice_id;
    const vendor_id = req.body.vendor_id;
    const version = req.body.version;

    const accessToken = await getAccessToken();

    const BASE_URL = version === "test" ? process.env.ULTRASTRATEGY_TEST_API_BASE : process.env.ULTRASTRATEGY_API_BASE;

    /* ---------------- FETCH INVOICE ---------------- */

    const invoiceResp = await axios.get(
      `${BASE_URL}/obj/invoices/${bubble_invoice_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ULTRASTRATEGY_API_KEY}`
        }
      }
    );

    const invoice = invoiceResp.data.response;

    const projectId = invoice.project;
    const timesheetMonth = invoice.TimesheetMonth;

    /* ---------------- FETCH PROJECT ---------------- */

    const projectResp = await axios.get(
      `${BASE_URL}/obj/project/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ULTRASTRATEGY_API_KEY}`
        }
      }
    );

    const project = projectResp.data.response;

    /* ---------------- TAX LOGIC (CONSULTANT) ---------------- */

let tax_id = null;
let reverse_charge_tax_id = null;
let is_reverse_charge_applied = false;

const vatLineConsultant = project["VATline - Consultant"];

// ===============================
// 1. REVERSE CHARGE CASE
// ===============================
if (vatLineConsultant === "Yes") {

  is_reverse_charge_applied = true;

  // IMPORTANT: ONLY reverse charge tax
  reverse_charge_tax_id = "7703978000000109088";

  tax_id = null; // NEVER send normal tax

}

// ===============================
// 2. NORMAL VAT / ZERO TAX CASE
// ===============================
else {

  is_reverse_charge_applied = false;

  const taxStatus = project["OS.Tax.Status. consultant"];
  const vatPercentage = Number(project["VATpercentage (consultant)"]) || 0;

  if (taxStatus === "VAT applicable") {

    if (vatPercentage === 20) {
      tax_id = "7703978000000109057"; // standard VAT
    } else {
      tax_id = "7703978000000109136"; // zero rated
    }

  } else {

    tax_id = "7703978000000109136"; // default zero rated
  }
}

    /* ---------------- PARSE CONSULTANT LINE ITEMS ---------------- */

    let rawItems = invoice["invoice_item_list - consultant"];

    if (!Array.isArray(rawItems)) {
      rawItems = [rawItems];
    }

    const line_items = rawItems.map(row => {

      const [name, desc1, desc2, numbers] = row.split("|").map(s => s.trim());

      const nums = numbers.split(":").filter(Boolean).map(Number);

      const qty = nums[0] || 1;
      const rate = nums[1] || 0;

      const description = `${name} | ${desc1} | ${desc2}`;

      return {
        account_id: "7703978000000034003", // Expense account
        description,
        quantity: qty,
        rate,
        ...(tax_id && { tax_id }),
        ...(reverse_charge_tax_id && { reverse_charge_tax_id })
      };

    });

    /* ---------------- CREATE ZOHO BILL ---------------- */

    const billBody = {

      vendor_id,
      bill_number: invoice.invoice_number,
      reference_number: invoice.invoice_number,
      date: invoice.issue_date.split("T")[0],
      due_date: invoice.due_date.split("T")[0],
      currency_code: invoice["os.currency"] || "USD",
      line_items,
      is_reverse_charge_applied,
      custom_fields: [
        {
          customfield_id: "7703978000000117027",
          value: bubble_invoice_id
        }
      ]

    };

    const createResp = await axios.post(
      "https://www.zohoapis.com/books/v3/bills",
      billBody,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID
        }
      }
    );

    const zohoBillId = createResp.data.bill.bill_id;

    console.log("Bill created:", invoice.invoice_number);

    const invoiceType = invoice["OS.invoice.type"];

    /* ---------------- ATTACHMENT ---------------- */

    const fileResp = await axios.post(
      "https://n8n.anqa.it/webhook/ea7f7d6d-e9bd-45fe-8612-e61e62b1fd98",
      {
        timesheetmonth: timesheetMonth,
        type: invoiceType,
        project: projectId,
        version: version
      },
      {
        responseType: "arraybuffer"
      }
    );

    const formData = new FormData();

    formData.append("attachment", fileResp.data, {
      filename: `${invoice.invoice_number}.pdf`,
      contentType: "application/pdf"
    });

    await axios.post(
      `https://www.zohoapis.com/books/v3/bills/${zohoBillId}/attachment`,
      formData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          ...formData.getHeaders()
        },
        params: {
          organization_id: process.env.ZOHO_ORGANIZATION_ID
        }
      }
    );

    console.log("Bill attachment uploaded");

    res.json({
      success: true,
      zoho_bill_id: zohoBillId
    });

  } catch (err) {

    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: "Bill creation failed",
      details: err.response?.data || err.message
    });

  }
});


/*-------------------------------------------------
    6. Update Customer
-------------------------------------------------*/

app.patch("/fr/update-customer", async (req, res) => {
  try {

    const accessToken = await getAccessToken();
    const contact_id = req.body.contact_id;

    if (!contact_id) {
      return res.status(400).json({
        error: "contact_id is required"
      });
    }

    let updateData = {};

    /* -------- GET EXISTING CONTACT (IMPORTANT) -------- */

    const existingContactResp = await axios.get(
      `https://www.zohoapis.com/books/v3/contacts/${contact_id}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    const existingContact = existingContactResp.data.contact;

    const existingContactPerson =
      existingContact.contact_persons &&
      existingContact.contact_persons.length > 0
        ? existingContact.contact_persons[0]
        : null;

    /* -------- OPTIONAL CURRENCY LOOKUP -------- */

    if (req.body.currency) {

      const currencyResp = await axios.get(
        "https://www.zohoapis.com/books/v3/settings/currencies",
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`
          },
          params: {
            organization_id: ZOHO_ORGANIZATION_ID
          }
        }
      );

      const currencies = currencyResp.data.currencies;

      const currencyObj = currencies.find(
        c => c.currency_code === req.body.currency
      );

      if (!currencyObj) {
        return res.status(400).json({
          error: `Currency ${req.body.currency} not found in Zoho`
        });
      }

      updateData.currency_id = currencyObj.currency_id;
    }

    /* -------- OPTIONAL FIELDS -------- */

    if (req.body.contact_name) {
      updateData.contact_name = req.body.contact_name;
    }

    if (req.body.company_name) updateData.company_name = req.body.company_name;
    if (req.body.tax_treatment) updateData.tax_treatment = req.body.tax_treatment;
    if (req.body.place_of_contact) updateData.place_of_contact = req.body.place_of_contact;
    if (req.body.tax_reg_no) updateData.tax_reg_no = req.body.tax_reg_no;
    if (req.body.vat_reg_no) updateData.vat_reg_no = req.body.vat_reg_no;

    /* -------- PAYMENT TERMS -------- */

    if (req.body.payment_terms) updateData.payment_terms = req.body.payment_terms;
    if (req.body.payment_terms_label) updateData.payment_terms_label = req.body.payment_terms_label;

    /* -------- BILLING ADDRESS -------- */

    if (req.body.billing_address) {
      updateData.billing_address = {
        address: req.body.billing_address.address,
        city: req.body.billing_address.city,
        zip: req.body.billing_address.zip,
        country: req.body.billing_address.country
      };
    }

    /* -------- CONTACT PERSON SAFE UPDATE -------- */

    if (
      req.body.contact_name ||
      req.body.email ||
      req.body.phone
    ) {

      updateData.contact_persons = [
        {
          contact_person_id: existingContactPerson?.contact_person_id,

          first_name:
            req.body.contact_name ||
            existingContactPerson?.first_name ||
            "",

          email:
            req.body.email ||
            existingContactPerson?.email ||
            "",

          phone:
            req.body.phone ||
            existingContactPerson?.phone ||
            ""
        }
      ];
    }

    /* -------- UPDATE CUSTOMER -------- */

    const response = await axios.put(
      `https://www.zohoapis.com/books/v3/contacts/${contact_id}`,
      updateData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    res.json(response.data);

  } catch (error) {

    console.error(
      "Update customer error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Failed to update customer"
    });

  }
});



/*-------------------------------------------------
    7. Update Vendor
-------------------------------------------------*/

app.patch("/fr/update-vendor", async (req, res) => {
  try {

    const accessToken = await getAccessToken();
    const contact_id = req.body.contact_id;

    if (!contact_id) {
      return res.status(400).json({
        error: "contact_id is required"
      });
    }

    let updateData = {};

    /* -------- GET EXISTING VENDOR -------- */

    const existingContactResp = await axios.get(
      `https://www.zohoapis.com/books/v3/contacts/${contact_id}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    const existingContact = existingContactResp.data.contact;

    const existingContactPerson =
      existingContact.contact_persons &&
      existingContact.contact_persons.length > 0
        ? existingContact.contact_persons[0]
        : null;

    /* -------- OPTIONAL CURRENCY LOOKUP -------- */

    if (req.body.currency) {

      const currencyResp = await axios.get(
        "https://www.zohoapis.com/books/v3/settings/currencies",
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`
          },
          params: {
            organization_id: ZOHO_ORGANIZATION_ID
          }
        }
      );

      const currencies = currencyResp.data.currencies;

      const currencyObj = currencies.find(
        c => c.currency_code === req.body.currency
      );

      if (!currencyObj) {
        return res.status(400).json({
          error: `Currency ${req.body.currency} not found in Zoho`
        });
      }

      updateData.currency_id = currencyObj.currency_id;
    }

    /* -------- OPTIONAL FIELDS -------- */

    if (req.body.contact_name) {
      updateData.contact_name = req.body.contact_name;
    }

    if (req.body.company_name) updateData.company_name = req.body.company_name;
    if (req.body.tax_treatment) updateData.tax_treatment = req.body.tax_treatment;
    if (req.body.place_of_contact) updateData.place_of_contact = req.body.place_of_contact;
    if (req.body.tax_reg_no) updateData.tax_reg_no = req.body.tax_reg_no;
    if (req.body.vat_reg_no) updateData.vat_reg_no = req.body.vat_reg_no;
    if (req.body.country_code) updateData.country_code = req.body.country_code;

    /* -------- PAYMENT TERMS -------- */

    if (req.body.payment_terms) updateData.payment_terms = req.body.payment_terms;
    if (req.body.payment_terms_label) updateData.payment_terms_label = req.body.payment_terms_label;

    /* -------- BILLING ADDRESS -------- */

    if (req.body.billing_address) {
      updateData.billing_address = {
        address: req.body.billing_address.address,
        city: req.body.billing_address.city,
        zip: req.body.billing_address.zip,
        country: req.body.billing_address.country
      };
    }

    /* -------- CONTACT PERSON SAFE UPDATE -------- */

    if (
      req.body.contact_name ||
      req.body.email ||
      req.body.phone
    ) {

      updateData.contact_persons = [
        {
          contact_person_id: existingContactPerson?.contact_person_id,

          first_name:
            req.body.contact_name ||
            existingContactPerson?.first_name ||
            "",

          email:
            req.body.email ||
            existingContactPerson?.email ||
            "",

          phone:
            req.body.phone ||
            existingContactPerson?.phone ||
            ""
        }
      ];
    }

    /* -------- UPDATE VENDOR -------- */

    const response = await axios.put(
      `https://www.zohoapis.com/books/v3/contacts/${contact_id}`,
      updateData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );

    res.json(response.data);

  } catch (error) {

    console.error(
      "❌ Update vendor error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Failed to update vendor"
    });

  }
});



/*-------------------------------------------------
    8. Default GET 3000 API
-------------------------------------------------*/
app.get("/", (req, res) => {
  res.send(`Zoho API server is running on Port:${process.env.PORT}`);
});

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
