// One-time enrichment script: adds `category` and `severity` to each lesson
// in vulnerabilities.js without touching any existing fields.
// Categories follow OWASP-style groupings; severity is a CVSS-informed
// qualitative rating (Critical / High / Medium) chosen per vuln class.

const fs = require("fs");
const path = require("path");

const meta = {
  "Server-Side Request Forgery (SSRF)": { category: "Server-Side", severity: "Critical" },
  "XML External Entity (XXE) Injection": { category: "Injection", severity: "High" },
  "Insecure Deserialization": { category: "Server-Side", severity: "Critical" },
  "Server-Side Template Injection (SSTI)": { category: "Injection", severity: "Critical" },
  "Cross-Site Request Forgery (CSRF)": { category: "Auth & Session", severity: "Medium" },
  "Path / Directory Traversal": { category: "Access Control", severity: "High" },
  "Local File Inclusion (LFI)": { category: "Access Control", severity: "High" },
  "Remote File Inclusion (RFI)": { category: "Access Control", severity: "Critical" },
  "Open Redirect": { category: "Auth & Session", severity: "Medium" },
  "Race Condition (TOCTOU)": { category: "Business Logic", severity: "High" },
  "Business Logic Vulnerability": { category: "Business Logic", severity: "Medium" },
  "Subdomain Takeover": { category: "Infrastructure", severity: "High" },
  "JWT Vulnerabilities": { category: "Auth & Session", severity: "Critical" },
  "Clickjacking (UI Redressing)": { category: "Client-Side", severity: "Medium" },
  "CORS Misconfiguration": { category: "Auth & Session", severity: "High" },
  "HTTP Request Smuggling": { category: "Infrastructure", severity: "Critical" },
  "Mass Assignment": { category: "Access Control", severity: "High" },
  "Prototype Pollution (JavaScript)": { category: "Client-Side", severity: "High" },
  "Server-Side Includes (SSI) Injection": { category: "Injection", severity: "High" },
  "LDAP Injection": { category: "Injection", severity: "High" },
  "NoSQL Injection": { category: "Injection", severity: "Critical" },
  "Unrestricted File Upload": { category: "Access Control", severity: "Critical" },
  "Host Header Injection": { category: "Server-Side", severity: "Medium" },
  "Cache Poisoning": { category: "Infrastructure", severity: "High" },
  "OAuth Misconfiguration": { category: "Auth & Session", severity: "Critical" },
  "GraphQL Vulnerabilities": { category: "API Security", severity: "Medium" },
  "Web Cache Deception": { category: "Infrastructure", severity: "Medium" },
  "Broken Object Level Authorization (BOLA)": { category: "API Security", severity: "Critical" },
  "Dependency Confusion": { category: "Supply Chain", severity: "Critical" },
  "Log4Shell / EL Injection": { category: "Injection", severity: "Critical" },
  "Memory Corruption: Buffer Overflow": { category: "Memory Safety", severity: "Critical" },
};

const filePath = path.join(__dirname, "..", "vulnerabilities.js");
const vulns = require(filePath);

const enriched = vulns.map((v) => {
  const m = meta[v.name];
  if (!m) throw new Error(`No metadata mapped for "${v.name}"`);
  // Insert category/severity right after name, preserving every existing field.
  const { name, definition, ...rest } = v;
  return { name, category: m.category, severity: m.severity, definition, ...rest };
});

const out =
  "// Auto-generated field order: name, category, severity, definition, theory, cve, exploit, mitigation, quiz.\n" +
  "// Categories follow OWASP-style groupings; severity is a qualitative CVSS-informed rating.\n" +
  "module.exports = " +
  JSON.stringify(enriched, null, 2) +
  ";\n";

fs.writeFileSync(filePath, out);
console.log("Enriched", enriched.length, "lessons.");
