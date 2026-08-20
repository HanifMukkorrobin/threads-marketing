#!/usr/bin/env python3
"""
Hermes Agent Autonomous Cron Runner (Python 3)

Simulates Hermes AI generating high-converting thread drafts for active products
and publishing approved drafts to Threads.

Usage:
    python3 scripts/hermes-runner/hermes_mock_cron.py --action generate
    python3 scripts/hermes-runner/hermes_mock_cron.py --action post
    python3 scripts/hermes-runner/hermes_mock_cron.py --action all
"""

import os
import sys
import json
import time
import random
import argparse
import urllib.request
import urllib.parse
import urllib.error

# ANSI Color codes for clean terminal outputs
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

def format_price(val):
    try:
        return f"Rp {int(val):,}".replace(",", ".")
    except Exception:
        return str(val)

def get_price_preview(p):
    variants = p.get("variants") or []
    if not variants:
        return "harga hemat"
    prices = [v.get("price", 0) for v in variants if isinstance(v, dict) and v.get("price")]
    if prices:
        return f"mulai {format_price(min(prices))}"
    return "harga hemat"

def get_variant_list_text(p):
    variants = p.get("variants") or []
    if not variants:
        return ""
    lines = []
    for v in variants[:3]:
        dur = f" ({v.get('duration')})" if v.get("duration") else ""
        lines.append(f"• {v.get('name')}: {format_price(v.get('price', 0))}{dur}")
    return "\n".join(lines)

def get_usp_bullet_list(p):
    usps = p.get("usp") or []
    if not usps:
        return "• Full garansi & proses instan"
    return "\n".join([f"✅ {u}" for u in usps[:4]])

def get_store_handle(s):
    if isinstance(s, dict) and s.get("username"):
        return s.get("username")
    return "tokodigital.id"

def get_store_name(s):
    if isinstance(s, dict) and s.get("name"):
        return s.get("name")
    return "Toko Digital ID"

def gen_storytelling(p, s=None):
    handle = get_store_handle(s)
    store_name = get_store_name(s)
    audience = f"buat {p.get('targetAudience').lower()}" if p.get('targetAudience') else "buat harian"
    cta = p.get('ctaTemplate') or f"Yuk amankan slot promo kamu sekarang, langsung DM @{handle} atau cek link di bio ya! 🚀"
    return {
        "title": f"[Kasus Nyata] Efisiensi Biaya {p.get('name')} untuk Workflow Harian",
        "posts": [
            {
                "orderIndex": 0,
                "content": f"Sering mengalami limit akun atau kendala akses saat mengejar deadline penting? 💡\n\nAda cara berlangganan {p.get('name')} resmi dan bergaransi dengan biaya terjangkau ({get_price_preview(p)}). Simak pembahasannya di bawah 🧵👇"
            },
            {
                "orderIndex": 1,
                "content": f"Keunggulan layanan di {store_name}:\n{get_usp_bullet_list(p)}\n\nPilihan paket tersedia:\n{get_variant_list_text(p)}\n\nDirancang untuk {audience} yang membutuhkan stabilitas akun tanpa kendala teknis."
            },
            {
                "orderIndex": 2,
                "content": f"Proses aktivasi langsung dan transparan tanpa perlu setup rumit.\n\n{cta}"
            }
        ]
    }

def gen_cost_efficiency(p, s=None):
    handle = get_store_handle(s)
    cta = p.get('ctaTemplate') or "Stok slot terbatas, amankan sekarang sebelum kehabisan!"
    return {
        "title": f"[Efisiensi] Optimasi Biaya Berlangganan {p.get('name')}",
        "posts": [
            {
                "orderIndex": 0,
                "content": f"Memaksimalkan anggaran digital bulanan bisa dimulai dari memilih paket langganan {p.get('name')} yang tepat dan bergaransi 💡\n\nBerikut perbandingan nilai dan opsi paket resmi 🧵👇"
            },
            {
                "orderIndex": 1,
                "content": f"Benefit utama:\n{get_usp_bullet_list(p)}\n\n💰 Varian paket resmi:\n{get_variant_list_text(p)}\n\nSetiap paket mencakup garansi replace dan bantuan teknis."
            },
            {
                "orderIndex": 2,
                "content": f"Optimalkan workflow digital Anda hari ini.\n\n👉 {cta} (Detail pemesanan resmi tersedia di bio profil @{handle})"
            }
        ]
    }

def gen_productivity(p, s=None):
    handle = get_store_handle(s)
    cta = p.get('ctaTemplate') or f"Langsung order via link di bio @{handle} untuk aktivasi instan!"
    return {
        "title": f"[Optimasi] Maksimalkan Fitur Pro {p.get('name')}",
        "posts": [
            {
                "orderIndex": 0,
                "content": f"Memanfaatkan fitur pro pada {p.get('name')} secara optimal dapat meningkatkan kecepatan eksekusi kerja secara signifikan ⚡️\n\nTips integrasi fitur ke dalam workflow harian 🧵👇"
            },
            {
                "orderIndex": 1,
                "content": f"Kenapa memilih layanan kami?\n{get_usp_bullet_list(p)}\n\nKatalog paket tersedia ({get_price_preview(p)}):\n{get_variant_list_text(p)}"
            },
            {
                "orderIndex": 2,
                "content": f"Tingkatkan produktivitas kerja dengan akun resmi bergaransi.\n\n⚡️ {cta}"
            }
        ]
    }

def gen_fomo(p, s=None):
    cta = p.get('ctaTemplate') or "Slot kuota terbatas, langsung amankan sebelum periode promo berakhir!"
    return {
        "title": f"[Informasi] Alokasi Paket Khusus {p.get('name')}",
        "posts": [
            {
                "orderIndex": 0,
                "content": f"Alokasi paket khusus {p.get('name')} kini kembali tersedia dengan kuota terbatas untuk periode ini 📌\n\nPastikan akun kerja Anda tetap aktif dan stabil 🧵👇"
            },
            {
                "orderIndex": 1,
                "content": f"Jaminan layanan:\n{get_usp_bullet_list(p)}\n\n📦 Paket yang tersedia:\n{get_variant_list_text(p)}"
            },
            {
                "orderIndex": 2,
                "content": f"Aktivasi cepat dan dipandu hingga siap digunakan.\n\n🚀 {cta}"
            }
        ]
    }

# Commercial Promo Hook Archetypes (Clean, Professional, and Value-Driven)
HUMANIZED_HOOK_ARCHETYPES = [
    {
        "angle": "Storytelling & Real Case",
        "generate": gen_storytelling,
    },
    {
        "angle": "Solusi Cerdas & Efisiensi Biaya",
        "generate": gen_cost_efficiency,
    },
    {
        "angle": "Productivity & Feature Optimization",
        "generate": gen_productivity,
    },
    {
        "angle": "Slot & Kuota Promo Terbatas",
        "generate": gen_fomo,
    }
]

# Organic & Knowledge Vault Content Archetypes for High-Signal Practitioner Threads
def get_organic_archetypes(s={}):
    handle = s.get("username") or "tokodigital.id"
    return [
        {
            "title": "[Workflow] 3 Praktik CLI & Terminal untuk Mempercepat Eksekusi",
            "hookAngle": "Tech & Workflow Architecture",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": "Mengurangi pergantian context (context-switching) antara GUI dan editor adalah kunci menjaga flow state engineering 🛠️\n\n3 konfigurasi terminal yang langsung terasa dampaknya 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": "1. Aliases & Shell Functions: Singkat perintah git & docker berulang menjadi 2-3 karakter.\n2. Fuzzy Finder (fzf): Navigasi ribuan file dalam hitungan milidetik tanpa mouse.\n3. Session Persistence: Gunakan tmux / zellij agar workspace selalu siap pakai saat terminal dibuka kembali."
                },
                {
                    "orderIndex": 2,
                    "content": f"Simpan thread ini untuk referensi setup workstation Anda! 📌\n\nFollow @{handle} untuk insight arsitektur software dan optimasi tools digital 🚀"
                }
            ]
        },
        {
            "title": "[AI Engineering] Mental Model Context Engineering untuk LLM Agent",
            "hookAngle": "Tech & AI Insights",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": "Prompt engineering bukan sekadar menyusun kata mutiara, melainkan merancang arsitektur context yang deterministic untuk model AI 🧠\n\n3 komponen context payload yang terbukti memangkas halusinasi 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": "1. System Directives: Definisikan batasan peran, constraint output, dan format strictly JSON.\n2. Grounding Context: Suntikkan data spesifik atau RAG chunk relevan sebelum query utama.\n3. Few-shot Demonstrations: Berikan 1-2 contoh pasangan input-output riil sebagai acuan struktur."
                },
                {
                    "orderIndex": 2,
                    "content": f"Bagaimana pendekatan context engineering di pipeline Anda saat ini? Diskusi di replies yuk! 👇\n\nFollow @{handle} untuk wawasan AI systems & software craft."
                }
            ]
        },
        {
            "title": "[Engineering Practice] Review Loop & Automated Verification",
            "hookAngle": "Software Engineering & Best Practices",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": "Bottleneck terbesar dalam shipping software berkualitas bukanlah kecepatan mengetik kode, melainkan loop verifikasi yang lambat ⚙️\n\nCara membangun feedback loop cepat sebelum commit 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": "• Pre-commit hooks: Jalankan linting, typechecking, dan security scan otomatis secara lokal.\n• Targeted unit tests: Verifikasi boundary conditions pada pure functions dalam < 2 detik.\n• Isolated environments: Pisahkan dev, staging, dan prod database agar tidak terjadi cross-contamination."
                },
                {
                    "orderIndex": 2,
                    "content": f"Disiplin verifikasi lokal menghemat jam debugging di production.\n\nSimpan thread ini 📌 dan follow @{handle} untuk artikel sistem & engineering practices."
                }
            ]
        },
        {
            "title": "[Architecture] 4 Kategori Tools Esensial untuk Modern Developer Stack",
            "hookAngle": "Rekomendasi Tools Digital",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": "Membangun workstation yang lean memerlukan pemilihan tools dengan rasio utility-to-overhead terbaik 🛠️\n\n4 pilar stack digital untuk meningkatkan output kerja harian 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": "1. AI Coding Assistant: Mempercepat prototyping dan eksplorasi boilerplate.\n2. Local Container Runtime: Isolasi dependencies tanpa mengotori host OS.\n3. Structured Note Vault: Dokumentasikan mental model dan arsitektur keputusan teknis.\n4. Automated CI/CD Runner: Validasi build dan deployment tanpa intervensi manual."
                },
                {
                    "orderIndex": 2,
                    "content": f"Pastikan semua dependensi dan akun kerja Anda menggunakan lisensi resmi untuk kelancaran jangka panjang.\n\n👉 Cek rekomendasi tools pendukung di bio @{handle} ya! 🚀"
                }
            ]
        }
    ]


def get_hermes_api_key():
    key = os.getenv("HERMES_AI_API_KEY") or os.getenv("HERMES_CUSTOM_168_110_198_40_20128_API_KEY")
    if not key:
        env_file = os.path.expanduser("~/.hermes/.env")
        if os.path.exists(env_file):
            try:
                with open(env_file) as f:
                    for line in f:
                        if line.startswith("HERMES_CUSTOM_168_110_198_40_20128_API_KEY="):
                            key = line.strip().split("=", 1)[1].strip("\"'")
                            break
            except Exception:
                pass
    return key or ""


def generate_via_hermes_llm(product=None, store=None, angle=None, custom_topic=None):
    api_key = get_hermes_api_key()
    if not api_key:
        return None

    store_handle = get_store_handle(store)
    store_name = get_store_name(store)

    if product:
        context_str = f"PRODUK: {product.get('name')} ({product.get('category', 'Digital Service')})\nUSP: {get_usp_bullet_list(product)}\nHARGA:\n{get_variant_list_text(product)}"
        system_prompt = f"""You are a Digital Specialist & Solution Consultant writing clear, high-converting product showcases for Threads.
Generate fresh, non-generic, professional 3-part thread.
RULES:
1. Professional, honest, direct, value-driven, and consultative Indonesian.
2. NO cheap marketing hype or forced cheesy slang.
3. Strictly UNDER 500 characters per post.
4. Post 1 (Hook + 🧵👇), Post 2 (Value / Benefit / Price proof), Post 3 (CTA to @{store_handle}).
5. Output JSON ONLY:
{{"title": "...", "hookAngle": "{angle or 'Clean Commercial Promo'}", "posts": [{{"orderIndex": 0, "content": "..."}}, {{"orderIndex": 1, "content": "..."}}, {{"orderIndex": 2, "content": "..."}}]}}
"""
    else:
        context_str = f"KONTEN ORGANIK / EDUKASI: {custom_topic or 'Framework arsitektur AI agent, terminal workflow, atau efisiensi tools software 2026'}"
        system_prompt = f"""You are a Senior Software & AI Systems Architect and hands-on Tech Practitioner writing for Threads.
Generate fresh, high-signal, authentic 3-part thread.
RULES:
1. Senior tech practitioner tone: pragmatic, direct, systems-thinking, and intellectually honest.
2. NO cringe marketing slang (no gess, sat-set, boncos, nugas).
3. Strictly UNDER 500 characters per post.
4. Post 1 (Technical hook + 🧵👇), Post 2 (Concrete workflow / mental model / architecture), Post 3 (Technical discussion or follow @{store_handle}).
5. Output JSON ONLY:
{{"title": "...", "hookAngle": "{angle or 'Tech Systems Practitioner'}", "posts": [{{"orderIndex": 0, "content": "..."}}, {{"orderIndex": 1, "content": "..."}}, {{"orderIndex": 2, "content": "..."}}]}}
"""

    user_prompt = f"""TOKO: {store_name} (@{store_handle})
{context_str}
ANGLE: {angle or 'Contrarian / Fresh Insight'}
Buat 1 rangkaian thread baru yang fresh, menarik, dan berbobot tinggi. Output JSON only."""

    url = os.getenv("HERMES_AI_BASE_URL", "http://168.110.198.40:20128/v1/chat/completions")
    payload = {
        "model": os.getenv("HERMES_AI_MODEL", "ag/gemini-3.6-flash-high"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "temperature": 0.75
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content:
                cleaned = content.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1]
                    if cleaned.endswith("```"):
                        cleaned = cleaned.rsplit("```", 1)[0]
                parsed = json.loads(cleaned.strip())
                if parsed and parsed.get("posts") and len(parsed["posts"]) >= 2:
                    return parsed
    except Exception as e:
        print(f"   ⚠️ Hermes LLM call skipped/fallback ({e})")

    return None


def make_request(url: str, method: str = "GET", headers: dict = None, payload: dict = None):
    req_headers = {
        "Content-Type": "application/json",
        "User-Agent": "Hermes-Agent-Python-Runner/1.0",
    }
    if headers:
        req_headers.update(headers)

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            resp_body = response.read().decode("utf-8")
            return response.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed_err = json.loads(err_body)
        except Exception:
            parsed_err = {"error": err_body}
        return e.code, parsed_err
    except Exception as e:
        return 500, {"error": str(e)}


def publish_draft_to_threads_graph_api(draft: dict, access_token: str, user_id: str, store_username: str):
    target_user_id = user_id
    if not target_user_id:
        try:
            me_url = f"https://graph.threads.net/v1.0/me?fields=id,username&access_token={urllib.parse.quote(access_token)}"
            me_status, me_data = make_request(me_url)
            if me_status == 200 and me_data.get("id"):
                target_user_id = me_data["id"]
                if me_data.get("username"):
                    store_username = me_data["username"]
            else:
                target_user_id = "me"
        except Exception:
            target_user_id = "me"

    posts = draft.get("posts") or []
    posts_sorted = sorted(posts, key=lambda x: x.get("orderIndex", 0))
    if not posts_sorted:
        posts_sorted = [{"orderIndex": 0, "content": draft.get("title", "")}]

    root_post_id = None
    last_post_id = None

    for i, post_item in enumerate(posts_sorted):
        content = post_item.get("content", "")
        print(f"   [Post {i + 1}/{len(posts_sorted)}] Mengunggah ke Meta Threads container...")

        # 1. Create Media Container
        media_url = (post_item.get("mediaUrl") or "").strip()
        container_params = {
            "text": content,
            "access_token": access_token
        }
        if media_url:
            lower_url = media_url.lower().split("?")[0]
            if lower_url.endswith((".mp4", ".mov")):
                container_params["media_type"] = "VIDEO"
                container_params["video_url"] = media_url
            else:
                container_params["media_type"] = "IMAGE"
                container_params["image_url"] = media_url
        else:
            container_params["media_type"] = "TEXT"

        if i > 0 and last_post_id:
            container_params["reply_to_id"] = last_post_id

        container_query = urllib.parse.urlencode(container_params)
        c_status, c_data = make_request(
            f"https://graph.threads.net/v1.0/{target_user_id}/threads?{container_query}",
            method="POST"
        )

        if c_status != 200:
            err_msg = c_data.get("error", {}).get("message") if isinstance(c_data.get("error"), dict) else c_data.get("error", f"HTTP {c_status}")
            raise RuntimeError(f"Threads Container Creation Error (Post {i + 1}): {err_msg}")

        creation_id = c_data.get("id")
        if not creation_id:
            raise RuntimeError(f"No creation ID returned from Threads API: {c_data}")

        # 2. Wait / Poll for Container Status == FINISHED
        for attempt in range(15):
            status_query = urllib.parse.urlencode({
                "fields": "status,error_message",
                "access_token": access_token
            })
            s_status, s_data = make_request(
                f"https://graph.threads.net/v1.0/{creation_id}?{status_query}"
            )
            if s_status == 200:
                c_status_val = s_data.get("status")
                if c_status_val == "FINISHED":
                    break
                elif c_status_val == "ERROR":
                    err_detail = s_data.get("error_message") or "Media container processing error"
                    raise RuntimeError(f"Threads Container Error (Post {i + 1}): {err_detail}")
            time.sleep(2)

        # 3. Publish Container
        publish_params = {
            "creation_id": creation_id,
            "access_token": access_token
        }
        publish_query = urllib.parse.urlencode(publish_params)
        p_status, p_data = make_request(
            f"https://graph.threads.net/v1.0/{target_user_id}/threads_publish?{publish_query}",
            method="POST"
        )

        if p_status != 200:
            err_msg = p_data.get("error", {}).get("message") if isinstance(p_data.get("error"), dict) else p_data.get("error", f"HTTP {p_status}")
            raise RuntimeError(f"Threads Publish Error (Post {i + 1}): {err_msg}")

        published_id = p_data.get("id")
        if not published_id:
            raise RuntimeError(f"No published ID returned from Threads API: {p_data}")

        if i == 0:
            root_post_id = published_id
        last_post_id = published_id

        if i < len(posts_sorted) - 1:
            time.sleep(2)

    # 3. Retrieve Permalink
    permalink = f"https://www.threads.net/@{store_username}/post/{root_post_id}"
    try:
        link_status, link_data = make_request(
            f"https://graph.threads.net/v1.0/{root_post_id}?fields=permalink&access_token={urllib.parse.quote(access_token)}"
        )
        if link_status == 200 and link_data.get("permalink"):
            permalink = link_data["permalink"]
    except Exception:
        pass

    return root_post_id, permalink


def run_hermes_cron(base_url: str, api_key: str, action: str, threads_token: str = None, threads_uid: str = None):
    base_url = base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {api_key}"}

    print(f"\n{BOLD}{CYAN}=================================================={RESET}")
    print(f"{BOLD}{CYAN}🤖 HERMES AGENT CRON RUNNER (Python 3) — [{action.upper()}]{RESET}")
    print(f"📍 Base URL: {BLUE}{base_url}{RESET}")
    print(f"🔑 Auth: {YELLOW}Bearer {api_key[:8]}...{RESET}")
    print(f"{BOLD}{CYAN}=================================================={RESET}\n")

    generated_count = 0
    published_count = 0
    errors = []

    # 1. ACTION: GENERATE
    if action in ("generate", "all"):
        print(f"{BOLD}📥 [Step 1] Mengambil katalog produk aktif & riwayat draft...{RESET}")
        
        # Fetch recent drafts to prevent duplicate topic and angle loops
        d_status, d_data = make_request(f"{base_url}/api/drafts", headers=headers)
        recent_drafts = (d_data.get("drafts") or d_data.get("data") or []) if d_status == 200 else []

        status, data = make_request(f"{base_url}/api/hermes/products/active", headers=headers)
        if status != 200:
            err_msg = data.get("error", f"HTTP {status}")
            print(f"   {RED}❌ Gagal fetch produk aktif: {err_msg}{RESET}")
            errors.append(f"Generate fetch error: {err_msg}")
        else:
            products = data.get("products") or data.get("data") or []
            store = data.get("store") or {"name": "Toko Digital ID", "username": "tokodigital.id"}
            print(f"   Ditemukan {len(products)} produk aktif.")
            print(f"   Store Profile: {store.get('name')} (@{store.get('username')})")
            print(f"   Riwayat Draft Terdaftar: {len(recent_drafts)} item.")

            # 1. Generate Product Drafts (if products available)
            if products:
                # Select least recently drafted product
                product = products[0]
                available_angles = [a["angle"] for a in HUMANIZED_HOOK_ARCHETYPES]
                used_product_angles = [d.get("hookAngle") for d in recent_drafts if d.get("productId") == product.get("id")]
                remaining_angles = [a for a in available_angles if a not in used_product_angles[:len(available_angles)-1]]
                chosen_angle = random.choice(remaining_angles) if remaining_angles else random.choice(available_angles)
                
                matched_archetype = next((a for a in HUMANIZED_HOOK_ARCHETYPES if a["angle"] == chosen_angle), HUMANIZED_HOOK_ARCHETYPES[0])
                llm_gen = generate_via_hermes_llm(product=product, store=store, angle=chosen_angle)
                
                if llm_gen and llm_gen.get("posts"):
                    final_title = llm_gen.get("title", f"[Promo] {product.get('name')}")
                    final_angle = llm_gen.get("hookAngle", chosen_angle)
                    final_posts = llm_gen["posts"]
                    gen_source = "hermes-ai-llm"
                else:
                    gen = matched_archetype["generate"](product, store)
                    final_title = gen["title"]
                    final_angle = matched_archetype["angle"]
                    final_posts = gen["posts"]
                    gen_source = "hermes-archetype-fallback"

                print(f"✍️  [AI Product Generator] Menghasilkan draft untuk \"{product.get('name')}\" ({final_angle}) [{gen_source}]...")
                draft_payload = {
                    "productId": product.get("id"),
                    "title": final_title,
                    "type": "THREAD_CHAIN",
                    "hookAngle": final_angle,
                    "posts": final_posts,
                    "metadata": {
                        "runner": "hermes-cron-runner-py",
                        "persona": "CLEAN_COMMERCIAL_PROMO",
                        "contentType": "PRODUCT_PROMO",
                        "storeUsername": store.get("username"),
                        "model": "ag/gemini-3.6-flash-high",
                        "generatorSource": gen_source,
                    }
                }

                create_status, create_data = make_request(
                    f"{base_url}/api/hermes/drafts",
                    method="POST",
                    headers=headers,
                    payload=draft_payload
                )

                if create_status in (200, 201):
                    draft = create_data.get("draft") or create_data.get("data") or {}
                    print(f"   {GREEN}✅ Draft produk tersimpan (ID: {draft.get('id')}) — Status: PENDING_REVIEW{RESET}")
                    generated_count += 1
                else:
                    err_msg = create_data.get("error", f"HTTP {create_status}")
                    print(f"   {RED}❌ Gagal membuat draft produk: {err_msg}{RESET}")
                    errors.append(f"Create draft error: {err_msg}")

            # 2. Generate Organic / Non-Product Engagement Draft (productId: None)
            organic_topics = [
                "Praktik context engineering memangkas halusinasi LLM agent",
                "Arsitektur feedback loop dan local verification sebelum deployment",
                "Optimasi workflow terminal dan CLI untuk modern software engineer",
                "Pentingnya isolasi environment dev, test, dan prod database",
                "4 pilar workstation lean developer stack 2026",
                "Model Context Protocol (MCP) sebagai standar integrasi tools AI",
                "Doubt-Driven Development: Pola adversarial verification pada autonomous coding",
                "Mental model spec-driven development untuk memangkas iterasi gagal",
            ]
            
            # Rotate topic by filtering out recent organic titles
            recent_organic_titles = [d.get("title", "") for d in recent_drafts if not d.get("productId")]
            available_topics = [t for t in organic_topics if not any(t.lower() in rt.lower() for rt in recent_organic_titles[:len(organic_topics)-1])]
            selected_topic = random.choice(available_topics) if available_topics else random.choice(organic_topics)
            
            organic_angles = [
                "Unpopular Industry Truth",
                "Real Case & Breakdown Skenario",
                "Workflow & Tool Teardown",
                "Actionable Framework / Step-by-Step",
                "Curation & High-Utility Insights",
            ]
            recent_org_angles = [d.get("hookAngle") for d in recent_drafts if not d.get("productId")]
            avail_org_angles = [a for a in organic_angles if a not in recent_org_angles[:len(organic_angles)-1]]
            selected_angle = random.choice(avail_org_angles) if avail_org_angles else random.choice(organic_angles)

            org_llm = generate_via_hermes_llm(product=None, store=store, angle=selected_angle, custom_topic=selected_topic)

            if org_llm and org_llm.get("posts"):
                final_org_title = org_llm.get("title", f"[Insight] {selected_topic}")
                final_org_angle = org_llm.get("hookAngle", selected_angle)
                final_org_posts = org_llm["posts"]
                org_source = "hermes-ai-llm"
            else:
                organic_archetypes = get_organic_archetypes(store)
                organic = random.choice(organic_archetypes)
                final_org_title = organic["title"]
                final_org_angle = organic["hookAngle"]
                final_org_posts = organic["posts"]
                org_source = "hermes-archetype-fallback"

            print(f"✍️  [AI Organic Generator] Menghasilkan konten edukasi non-produk: \"{final_org_title}\" ({final_org_angle}) [{org_source}]...")
            organic_payload = {
                "productId": None,
                "title": final_org_title,
                "type": "THREAD_CHAIN",
                "hookAngle": final_org_angle,
                "posts": final_org_posts,
                "metadata": {
                    "runner": "hermes-cron-runner-py",
                    "persona": "TECH_SYSTEMS_PRACTITIONER",
                    "contentType": "ORGANIC_ENGAGEMENT",
                    "storeUsername": store.get("username"),
                    "model": "ag/gemini-3.6-flash-high",
                    "generatorSource": org_source,
                }
            }


            org_status, org_data = make_request(
                f"{base_url}/api/hermes/drafts",
                method="POST",
                headers=headers,
                payload=organic_payload
            )

            if org_status in (200, 201):
                org_draft = org_data.get("draft") or org_data.get("data") or {}
                print(f"   {GREEN}✅ Draft organik tersimpan (ID: {org_draft.get('id')}) — Status: PENDING_REVIEW{RESET}")
                generated_count += 1
            else:
                err_msg = org_data.get("error", f"HTTP {org_status}")
                print(f"   {RED}❌ Gagal membuat draft organik: {err_msg}{RESET}")
                errors.append(f"Create organic draft error: {err_msg}")

    # 2. ACTION: POST
    if action in ("post", "all"):
        print(f"\n{BOLD}📤 [Step 2] Mengambil antrean draft yang disetujui (APPROVED)...{RESET}")
        status, data = make_request(f"{base_url}/api/hermes/drafts/approved", headers=headers)
        if status != 200:
            err_msg = data.get("error", f"HTTP {status}")
            print(f"   {RED}❌ Gagal fetch draft approved: {err_msg}{RESET}")
            errors.append(f"Post fetch error: {err_msg}")
        else:
            approved_drafts = data.get("drafts") or data.get("data") or []
            print(f"   Ditemukan {len(approved_drafts)} draft siap posting.")

            # Fetch store settings for post URL handle & Threads API credentials
            store_username = "tokodigital.id"
            threads_access_token = threads_token or os.getenv("THREADS_ACCESS_TOKEN", "")
            threads_user_id = threads_uid or os.getenv("THREADS_USER_ID", "")

            settings_status, settings_data = make_request(f"{base_url}/api/settings", headers=headers)
            if settings_status == 200:
                s_settings = settings_data.get("settings") or {}
                store_username = s_settings.get("STORE_USERNAME") or store_username
                if not threads_access_token and s_settings.get("THREADS_ACCESS_TOKEN"):
                    threads_access_token = s_settings.get("THREADS_ACCESS_TOKEN")
                if not threads_user_id and s_settings.get("THREADS_USER_ID"):
                    threads_user_id = s_settings.get("THREADS_USER_ID")

            for draft in approved_drafts:
                draft_id = draft.get("id")
                draft_title = draft.get("title")
                print(f"🚀 [Threads Publisher] Memposting draft \"{draft_title}\" (ID: {draft_id})...")

                try:
                    final_post_id = ""
                    final_post_url = ""

                    if threads_access_token:
                        print(f"   🌐 Menghubungi Meta Threads Graph API (User ID: {threads_user_id or 'me'})...")
                        final_post_id, final_post_url = publish_draft_to_threads_graph_api(
                            draft,
                            threads_access_token,
                            threads_user_id,
                            store_username
                        )
                    else:
                        print(f"   ⚠️ [Mode Simulasi] THREADS_ACCESS_TOKEN tidak ditemukan, menggunakan mock ID...")
                        final_post_id = f"th_{int(time.time())}_{random.randint(1000, 9999)}"
                        final_post_url = f"https://threads.net/@{store_username}/post/{int(time.time())}"

                    patch_status, patch_data = make_request(
                        f"{base_url}/api/hermes/drafts/{draft_id}/status",
                        method="PATCH",
                        headers=headers,
                        payload={
                            "status": "PUBLISHED",
                            "threadPostId": final_post_id,
                            "threadPostUrl": final_post_url,
                        }
                    )

                    if patch_status == 200:
                        print(f"   {GREEN}✅ Berhasil dipublikasikan ke Threads!{RESET}")
                        print(f"   🔗 {CYAN}Live URL: {final_post_url}{RESET}")
                        published_count += 1
                    else:
                        err_msg = patch_data.get("error", f"HTTP {patch_status}")
                        print(f"   {RED}❌ Gagal update status draft: {err_msg}{RESET}")
                        errors.append(f"Publish update error on {draft_id}: {err_msg}")
                except Exception as draft_err:
                    err_msg = str(draft_err)
                    print(f"   {RED}❌ Gagal memposting draft {draft_id}: {err_msg}{RESET}")
                    errors.append(f"Publish error on {draft_id}: {err_msg}")

                    # Update draft to FAILED status
                    make_request(
                        f"{base_url}/api/hermes/drafts/{draft_id}/status",
                        method="PATCH",
                        headers=headers,
                        payload={
                            "status": "FAILED",
                            "errorMessage": err_msg,
                        }
                    )

    print(f"\n{BOLD}{CYAN}=================================================={RESET}")
    print(f"{BOLD}{GREEN}🎉 RUNNER SELESAI:{RESET}")
    print(f"   - Draft Dibuat: {generated_count}")
    print(f"   - Draft Diposting: {published_count}")
    print(f"   - Total Error: {len(errors)}")
    print(f"{BOLD}{CYAN}=================================================={RESET}\n")

    return {
        "generated_count": generated_count,
        "published_count": published_count,
        "errors": errors
    }


def main():
    parser = argparse.ArgumentParser(description="Hermes Agent Cron Runner")
    parser.add_argument(
        "--action",
        choices=["generate", "post", "all"],
        default="all",
        help="Action to perform: generate (create drafts), post (publish approved), all (both)"
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("HERMES_BASE_URL", "http://localhost:3000"),
        help="Base URL of Threads Marketing Engine API"
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("HERMES_API_KEY", "hermes-secret-key-2026"),
        help="Hermes API Key (Bearer token)"
    )
    parser.add_argument(
        "--threads-access-token",
        default=os.getenv("THREADS_ACCESS_TOKEN", ""),
        help="Meta Threads Long-Lived Access Token"
    )
    parser.add_argument(
        "--threads-user-id",
        default=os.getenv("THREADS_USER_ID", ""),
        help="Meta Threads User ID"
    )

    args = parser.parse_args()
    results = run_hermes_cron(
        args.base_url,
        args.api_key,
        args.action,
        threads_token=args.threads_access_token,
        threads_uid=args.threads_user_id
    )
    if results["errors"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
