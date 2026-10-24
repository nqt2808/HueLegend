from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "evidence"
OUT.mkdir(exist_ok=True)
BASE = "http://127.0.0.1:5173"
import os
import shutil
OFFLINE_QA = os.environ.get("HUELEGEND_OFFLINE_QA") == "1"
def mount(page):
    if not OFFLINE_QA:
        page.goto(BASE, wait_until="networkidle")
        return
    html=(ROOT/"web/index.html").read_text(encoding="utf-8")
    css=(ROOT/"web/styles.css").read_text(encoding="utf-8")
    bundle=(OUT/"qa-bundle.js").read_text(encoding="utf-8")
    html=html.replace('<link rel="stylesheet" href="./styles.css">',"<style>"+css+"</style>")
    html=html.replace('<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">',"")
    shim = """<base href="https://huelegend.example/"><script>
    document.addEventListener('click', function(event) {
      const a=event.target.closest('a[href^="#/"]');
      if(a){event.preventDefault();location.hash=a.getAttribute('href').slice(1);}
    }, true);
    </script>"""
    html=html.replace("</head>",shim+"</head>")
    html=html.replace('<script type="module" src="./js/app.js"></script>',"<script>"+bundle+"</script>")
    page.set_content(html,wait_until="load")

results = []
def mark(name):
    results.append({"test": name, "status": "PASS"})
def persona(page, role):
    page.locator("#connect-button").click()
    if page.locator('[data-action="choose-persona"]').count():
        page.locator('[data-action="choose-persona"]').click()
    page.locator(f'[data-persona="{role}"]').click()
    page.wait_for_function("!document.querySelector('#app-dialog').open")
def goto(page, route):
    page.evaluate("(r) => { location.hash = '/' + r; }", route)
    page.wait_for_timeout(80)
def submit(page, name):
    page.locator(f'form[data-form="{name}"] button[type="submit"]').click()
def confirm(page):
    page.locator('[data-action="confirm-transaction"]').wait_for(state="visible")
    page.locator('[data-action="confirm-transaction"]').click()
    page.wait_for_function("!document.querySelector('#app-dialog').open")
    page.wait_for_timeout(100)

with sync_playwright() as p:
    executable = os.environ.get("BROWSER_EXECUTABLE") or shutil.which("chromium") or shutil.which("chromium-browser")
    launch_options = {"headless": True}
    if executable:
        launch_options["executable_path"] = executable
    browser = p.chromium.launch(**launch_options)
    context = browser.new_context(viewport={"width":1440,"height":1080}, device_scale_factor=1,
        timezone_id="Asia/Ho_Chi_Minh", reduced_motion="reduce")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    mount(page)
    page.locator(".hero").wait_for()
    assert page.locator("#batch-rows tr").count() == 6
    assert page.locator("#mode-banner strong").inner_text() == "CHẾ ĐỘ MẪU"
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
    page.screenshot(path=str(OUT/"desktop-dashboard.png"), full_page=True)
    mark("Desktop: 6 lo mau, nhan nguon ro rang, khong tran ngang")

    page.locator('[data-action="view"][data-code="HL-MEXUNG-2026-001"]').first.click()
    page.locator("#batch-qr").wait_for()
    assert page.locator(".timeline-item").count() == 4
    page.locator("#batch-qr").screenshot(path=str(OUT/"qr-rendered.png"))
    page.screenshot(path=str(OUT/"desktop-trace.png"), full_page=True)
    mark("Tra cuu: timeline 4 chang va QR canvas duoc tao")

    with page.expect_download() as item:
        page.locator('[data-action="download-qr"]').click()
    item.value.save_as(str(OUT/"qr-download.png"))
    with page.expect_download() as item:
        page.locator('[data-action="export"]').click()
    item.value.save_as(str(OUT/"sample-export.json"))
    exported=json.loads((OUT/"sample-export.json").read_text())
    assert exported["mode"]=="demo" and exported["source"]=="DU_LIEU_MO_PHONG"
    assert exported["batch"]["batchCode"]=="HL-MEXUNG-2026-001"
    mark("Tai QR va JSON: danh dau mau, khong co TxHash gia")

    persona(page,"PRODUCER")
    goto(page,"create")
    page.locator("#batch-code").fill("HL-QA-NEW-001")
    page.locator("#product-name").fill("Mè xửng kiểm thử")
    page.locator("#origin").fill("Phú Hòa, Huế")
    page.locator("#initial-uri").fill("javascript:alert(1)")
    submit(page,"create")
    page.wait_for_function("document.querySelector('#create-form .form-error').textContent.length > 0")
    assert "Chứng từ" in page.locator("#create-form .form-error").inner_text()
    mark("Chan URI javascript truoc khi gui")

    page.locator("#initial-uri").fill("")
    submit(page,"create")
    confirm(page)
    page.wait_for_selector("#batch-qr")
    assert page.locator(".detail-product h2").inner_text()=="Mè xửng kiểm thử"
    assert page.locator(".timeline-item").count()==1
    mark("Producer: tao lo, xac nhan, tu mo timeline va QR")

    goto(page,"create")
    page.locator("#batch-code").fill("HL-QA-NEW-001")
    page.locator("#product-name").fill("Trung ma")
    page.locator("#origin").fill("Hue")
    submit(page,"create")
    page.wait_for_function("document.querySelector('#create-form .form-error').textContent.length > 0")
    assert "đã tồn tại" in page.locator("#create-form .form-error").inner_text()
    mark("Ma lo trung: hien loi tieng Viet, khong tao them")

    persona(page,"VISITOR")
    goto(page,"create")
    page.locator("#batch-code").fill("HL-QA-FRAUD")
    page.locator("#product-name").fill("Gia mao")
    page.locator("#origin").fill("Hue")
    submit(page,"create")
    page.wait_for_function("document.querySelector('#create-form .form-error').textContent.length > 0")
    assert "vai trò" in page.locator("#create-form .form-error").inner_text()
    assert not page.locator('dialog[open]').count()
    mark("Gian lan mo phong: khach khong duoc tao lo")

    persona(page,"INSPECTOR")
    goto(page,"inspect")
    page.locator("#verify-code").fill("HL-MEXUNG-2026-002")
    page.locator("#verify-note").fill("Kiểm tra giao diện")
    submit(page,"verify")
    confirm(page)
    page.wait_for_selector(".detail-product")
    assert page.locator(".detail-card .badge-success").count()==1
    mark("Inspector: verifyBatch dung 3 tham so, cap nhat trang thai")

    persona(page,"PRODUCER")
    goto(page,"stake")
    assert page.locator('[data-action="withdraw"]').is_disabled()
    mark("Ky quy: nut rut bi khoa khi con thoi han")

    persona(page,"OWNER")
    goto(page,"admin")
    page.locator("#new-fee").fill("0.011")
    submit(page,"fee")
    assert "trần" in page.locator('form[data-form="fee"] .form-error').inner_text()
    mark("Owner: chan phi vuot 0.01 ETH o giao dien")

    goto(page,"create")
    page.locator("#batch-code").fill("HL-QA-XSS")
    page.locator("#product-name").fill('<img src=x onerror="window.__XSS=1">')
    page.locator("#origin").fill("Hue")
    submit(page,"create")
    confirm(page)
    page.wait_for_selector(".detail-product")
    assert not page.locator(".detail-product img").count()
    assert page.evaluate("window.__XSS") is None
    assert "<img" in page.locator(".detail-product h2").inner_text()
    mark("XSS: ten lo doc hai hien thi nhu van ban, khong thuc thi")

    goto(page,"checkpoint")
    page.screenshot(path=str(OUT/"desktop-checkpoint.png"),full_page=True)
    assert not errors, errors
    mark("Khong co JavaScript pageerror trong cac luong da thu")
    context.close()

    mobile=browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=1,
        is_mobile=True, has_touch=True, reduced_motion="reduce")
    m=mobile.new_page()
    mount(m)
    m.locator(".hero").wait_for()
    assert m.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
    m.screenshot(path=str(OUT/"mobile-dashboard.png"),full_page=True)
    m.locator(".mobile-toggle").click()
    assert m.locator("#sidebar").evaluate("(el)=>el.classList.contains('open')")
    m.locator('#navigation a[href="#/trace"]').click()
    m.wait_for_function("!document.querySelector('#sidebar').classList.contains('open')")
    m.locator('[data-action="sample"]').click()
    m.locator("#batch-qr").wait_for()
    assert m.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
    m.screenshot(path=str(OUT/"mobile-trace.png"),full_page=True)
    mark("Mobile 390px: menu, tra cuu, QR; khong tran ngang toan trang")
    mobile.close()
    browser.close()

(OUT/"browser-tests.json").write_text(json.dumps({"results":results,"total":len(results),"pageErrors":errors},
    ensure_ascii=False,indent=2),encoding="utf-8")
for item in results:
    print("PASS:",item["test"])
print("TOTAL:",len(results),"PASS")
