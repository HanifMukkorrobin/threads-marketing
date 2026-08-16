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
import urllib.error

# ANSI Color codes for clean terminal outputs
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

HOOK_ARCHETYPES = [
    {
        "angle": "Problem-Agitate-Solve",
        "generate": lambda p: {
            "title": f"[PAS] Stop Boros Langganan {p.get('name')}",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": f"Masih sering boncos bayar langganan {p.get('name')} tiap bulan? 💸\n\nPadahal ada cara legal, anti-hold, & full garansi tanpa bikin kantong jebol. Simak tipsnya di thread ini 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": f"Kenapa harus bayar mahal kalau fitur yang kamu dapet 100% sama?\n\n✨ Keunggulan utama:\n" + "\n".join([f"• {u}" for u in p.get("usp", [])]) + f"\n\nPilihan paket mulai hemat banget!"
                },
                {
                    "orderIndex": 2,
                    "content": f"Cara order cepat:\n1. Klik link di bio profil @tokodigital.id\n2. Pilih paket {p.get('name')}\n3. Akun aktif instan dalam hitungan menit ⚡️\n\n{p.get('ctaTemplate') or 'Order sekarang sebelum kuota promo habis!'}"
                }
            ]
        }
    },
    {
        "angle": "Cost Comparison",
        "generate": lambda p: {
            "title": f"[Hemat] Perbandingan Harga {p.get('name')}",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": f"Nonton & nikmatin {p.get('name')} legal hemat hingga 70%? Bukan sulap bukan sihir! 🤯✨\n\nYuk bandingin pengeluaran bulanan kamu 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": f"📊 Bandingkan harganya:\n\n❌ Harga Normal: Jauh lebih mahal\n✅ Di Toko Digital ID: Super Hemat & Bergaransi!\n\nSemua akun bergaransi resmi & support 24/7."
                },
                {
                    "orderIndex": 2,
                    "content": "Jangan sampai kehabisan slot sharing legal hari ini.\n\n👉 Cek ketersediaan via link di bio sekarang juga! 🚀"
                }
            ]
        }
    },
    {
        "angle": "Secret Hack / Lifehack",
        "generate": lambda p: {
            "title": f"[Hack] Trik Maksimalkan {p.get('name')}",
            "posts": [
                {
                    "orderIndex": 0,
                    "content": f"Trik rahasia yang jarang orang tahu saat pakai {p.get('name')} di tahun 2026! 💡\n\nBikin pengalaman digitalmu makin smooth tanpa ribet 🧵👇"
                },
                {
                    "orderIndex": 1,
                    "content": f"Gak perlu bingung metode pembayaran luar negeri atau kena blokir kartu.\n\nDengan layanan kami, kamu langsung terima akun siap pakai dengan garansi penuh!"
                },
                {
                    "orderIndex": 2,
                    "content": "Yuk upgrade akunmu sekarang tanpa drama.\n\n🔗 Link pemesanan resmi ada di bio profil kami!"
                }
            ]
        }
    }
]


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


def run_hermes_cron(base_url: str, api_key: str, action: str):
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
        print(f"{BOLD}📥 [Step 1] Mengambil katalog produk aktif...{RESET}")
        status, data = make_request(f"{base_url}/api/hermes/products/active", headers=headers)
        if status != 200:
            err_msg = data.get("error", f"HTTP {status}")
            print(f"   {RED}❌ Gagal fetch produk aktif: {err_msg}{RESET}")
            errors.append(f"Generate fetch error: {err_msg}")
        else:
            products = data.get("products") or data.get("data") or []
            print(f"   Ditemukan {len(products)} produk aktif.")

            for product in products[:2]:
                archetype = random.choice(HOOK_ARCHETYPES)
                gen = archetype["generate"](product)

                print(f"✍️  [AI Generator] Menghasilkan draft untuk \"{product.get('name')}\" ({archetype['angle']})...")
                draft_payload = {
                    "productId": product.get("id"),
                    "title": gen["title"],
                    "type": "THREAD_CHAIN",
                    "hookAngle": archetype["angle"],
                    "posts": gen["posts"],
                    "metadata": {
                        "runner": "hermes-cron-runner-py",
                        "model": "hermes-3-70b",
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
                    print(f"   {GREEN}✅ Draft tersimpan (ID: {draft.get('id')}) — Status: PENDING_REVIEW{RESET}")
                    generated_count += 1
                else:
                    err_msg = create_data.get("error", f"HTTP {create_status}")
                    print(f"   {RED}❌ Gagal membuat draft: {err_msg}{RESET}")
                    errors.append(f"Create draft error: {err_msg}")

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

            for draft in approved_drafts:
                draft_id = draft.get("id")
                draft_title = draft.get("title")
                print(f"🚀 [Threads Publisher] Memposting draft \"{draft_title}\" (ID: {draft_id})...")

                fake_post_id = f"th_{int(time.time())}_{random.randint(1000, 9999)}"
                fake_post_url = f"https://threads.net/@tokodigital.id/post/{int(time.time())}"

                patch_status, patch_data = make_request(
                    f"{base_url}/api/hermes/drafts/{draft_id}/status",
                    method="PATCH",
                    headers=headers,
                    payload={
                        "status": "PUBLISHED",
                        "threadPostId": fake_post_id,
                        "threadPostUrl": fake_post_url,
                    }
                )

                if patch_status == 200:
                    print(f"   {GREEN}✅ Berhasil dipublikasikan ke Threads!{RESET}")
                    print(f"   🔗 {CYAN}Live URL: {fake_post_url}{RESET}")
                    published_count += 1
                else:
                    err_msg = patch_data.get("error", f"HTTP {patch_status}")
                    print(f"   {RED}❌ Gagal update status draft: {err_msg}{RESET}")
                    errors.append(f"Publish error on {draft_id}: {err_msg}")

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

    args = parser.parse_args()
    results = run_hermes_cron(args.base_url, args.api_key, args.action)
    if results["errors"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
