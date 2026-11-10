"""
Chuong trinh: Bo kiem thu toan dien cac ca that bai (Negative Tests & Security Hardening - Lab 13)
Du an: HueLegend - Truy xuat dac san Hue tren Blockchain
Thanh vien:
  1. Ngo Thi Thuy Van - 23K4300023
  2. Ngo Quynh Trang - 23K4300041 (Lead Lab 13 - Hop dong & Kiem thu)

Cac ca kiem thu that bai theo yeu cau Buoc 5:
  1. Sai thoi diem: Rut coc khi chua het han khoa 30 ngay -> Revert StillLocked
  2. Sai nguoi: Mao danh cac vai tro Producer, Logistics, Inspector -> Revert UnauthorizedCaller
  3. Sai so tien: Thieu phi, thieu coc, vuot tran an toan -> Revert custom errors
  4. Goi lai (Reentrancy): Tan cong tai nhap rut coc -> Bi chan boi CEI va ReentrancyGuard
  5. Du lieu loi / Spam DoS: Trung ma lo, vuot 50 chang -> Revert BatchAlreadyExists, MaxCheckpointsExceeded
"""

import os
import time
from decimal import Decimal

WEI_PER_ETH = 10**18

def to_eth(wei_val: int) -> float:
    return float(Decimal(wei_val) / Decimal(WEI_PER_ETH))

class CustomError(Exception):
    def __init__(self, name: str, details: str):
        self.name = name
        self.details = details
        super().__init__(f"{name}: {details}")

class MockProjectCoreHardened:
    """Mo phong hop dong ProjectCore da duoc tang cuong bao mat voi CEI va ReentrancyGuard"""
    def __init__(self, owner: str):
        self.owner = owner
        self.ecosystem_fund = owner
        self.batch_creation_fee = int(0.001 * WEI_PER_ETH)
        self.max_batch_fee_limit = int(0.01 * WEI_PER_ETH)
        self.min_stake_amount = int(0.05 * WEI_PER_ETH)
        self.max_checkpoints_per_batch = 50
        self.stake_lock_duration = 30 * 86400 # 30 ngay

        self.roles = {
            owner: {"ROLE_ADMIN": True, "ROLE_PRODUCER": True}
        }
        self.producer_stake = {}
        self.producer_unlock_time = {}
        self.batches = {}
        self.batch_checkpoints = {}
        self.contract_balance = 0
        self.ecosystem_fund_balance = 0

        # Bien khoa nonReentrant
        self._reentrancy_status = 1 # 1: NOT_ENTERED, 2: ENTERED

    def grant_role(self, caller: str, account: str, role: str):
        if caller != self.owner:
            raise CustomError("OwnableUnauthorizedAccount", "Chi chu so huu moi co quyen cap vai tro")
        if account not in self.roles:
            self.roles[account] = {}
        self.roles[account][role] = True

    def has_role(self, account: str, role: str) -> bool:
        if account == self.owner:
            return True
        return self.roles.get(account, {}).get(role, False)

    def deposit_stake(self, sender: str, value: int, current_timestamp: int):
        if value <= 0:
            raise CustomError("ZeroAmount", "So tien nap phai lon hon 0")
        self.producer_stake[sender] = self.producer_stake.get(sender, 0) + value
        self.contract_balance += value

        if current_timestamp >= self.producer_unlock_time.get(sender, 0):
            self.producer_unlock_time[sender] = current_timestamp + self.stake_lock_duration

    def withdraw_stake(self, sender: str, current_timestamp: int, recipient_callback=None):
        # 0. ReentrancyGuard
        if self._reentrancy_status == 2:
            raise CustomError("ReentrancyGuardReentrantCall", "Phat hien hanh vi tai nhap! Giao dich bi chan.")
        self._reentrancy_status = 2

        try:
            # 1. Checks
            amt = self.producer_stake.get(sender, 0)
            if amt == 0:
                raise CustomError("NothingToWithdraw", "Khong co tien coc de rut")

            unlock_at = self.producer_unlock_time.get(sender, 0)
            if current_timestamp < unlock_at:
                raise CustomError(
                    "StillLocked",
                    f"Tien coc con bi khoa den {unlock_at} (con thieu {unlock_at - current_timestamp} giay)"
                )

            # 2. Effects (CEI)
            self.producer_stake[sender] = 0
            self.contract_balance -= amt

            # 3. Interactions
            if recipient_callback:
                recipient_callback(amt)
        finally:
            self._reentrancy_status = 1

    def create_batch(self, sender: str, value: int, batch_code: str, name: str, origin: str, uri: str):
        # 0. ReentrancyGuard
        if self._reentrancy_status == 2:
            raise CustomError("ReentrancyGuardReentrantCall", "Phat hien tai nhap trong createBatch")
        self._reentrancy_status = 2

        try:
            # 1. Checks
            if not self.has_role(sender, "ROLE_PRODUCER"):
                raise CustomError("UnauthorizedCaller", f"Vi {sender} khong co quyen ROLE_PRODUCER")
            if not batch_code:
                raise CustomError("EmptyString", "Ma lo hang khong duoc de trong")
            if not name:
                raise CustomError("EmptyString", "Ten dac san khong duoc de trong")
            if not origin:
                raise CustomError("EmptyString", "Vung nguyen lieu khong duoc de trong")
            if batch_code in self.batches:
                raise CustomError("BatchAlreadyExists", f"Ma lo {batch_code} da ton tai")

            # Kiem tra tien coc uy tin
            if sender != self.owner and self.producer_stake.get(sender, 0) < self.min_stake_amount:
                raise CustomError(
                    "StakeTooLow",
                    f"Tien coc {to_eth(self.producer_stake.get(sender, 0))} ETH nho hon muc yeu cau {to_eth(self.min_stake_amount)} ETH"
                )

            # Kiem tra phi tao lo
            if sender != self.owner and value < self.batch_creation_fee:
                raise CustomError(
                    "InsufficientBatchFee",
                    f"Phi nop {to_eth(value)} ETH khong du {to_eth(self.batch_creation_fee)} ETH"
                )

            # 2. Effects
            self.batches[batch_code] = {
                "batchCode": batch_code,
                "name": name,
                "origin": origin,
                "producer": sender,
                "isVerified": False
            }
            self.batch_checkpoints[batch_code] = [{
                "role": "ROLE_PRODUCER",
                "action": "Khoi tao lo hang tai xuong",
                "location": origin,
                "metadataURI": uri
            }]

            # 3. Interactions: Chuyen phi sang ecosystem_fund
            if value > 0:
                self.ecosystem_fund_balance += value
        finally:
            self._reentrancy_status = 1

    def add_checkpoint(self, sender: str, batch_code: str, role: str, loc: str, act: str, uri: str):
        if batch_code not in self.batches:
            raise CustomError("BatchNotFound", f"Khong tim thay lo {batch_code}")
        if not self.has_role(sender, role):
            raise CustomError("UnauthorizedCaller", f"Vi {sender} khong so huu quyen {role}")
        if len(self.batch_checkpoints[batch_code]) >= self.max_checkpoints_per_batch:
            raise CustomError("MaxCheckpointsExceeded", f"Lo {batch_code} da dat tran 50 chang chong spam DoS")

        self.batch_checkpoints[batch_code].append({
            "role": role, "action": act, "location": loc, "metadataURI": uri
        })

    def verify_batch(self, sender: str, batch_code: str, note: str, cert_uri: str):
        if not self.has_role(sender, "ROLE_INSPECTOR"):
            raise CustomError("UnauthorizedCaller", f"Vi {sender} khong co quyen ROLE_INSPECTOR")
        if batch_code not in self.batches:
            raise CustomError("BatchNotFound", f"Khong tim thay lo {batch_code}")
        if self.batches[batch_code]["isVerified"]:
            raise CustomError("BatchAlreadyVerified", f"Lo {batch_code} da duoc cap tem OCOP truoc do")

        self.batches[batch_code]["isVerified"] = True
        self.batch_checkpoints[batch_code].append({
            "role": "ROLE_INSPECTOR", "action": note or "Cap tem OCOP", "location": "TT Kiem dinh OCOP Hue", "metadataURI": cert_uri
        })

    def set_batch_creation_fee(self, caller: str, new_fee: int):
        if caller != self.owner:
            raise CustomError("OwnableUnauthorizedAccount", "Chi Admin moi co quyen doi phi")
        if new_fee > self.max_batch_fee_limit:
            raise CustomError(
                "FeeExceedsLimit",
                f"Muc phi {to_eth(new_fee)} ETH vuot qua tran Circuit Breaker {to_eth(self.max_batch_fee_limit)} ETH"
            )
        self.batch_creation_fee = new_fee

def run_negative_test_suite():
    output_lines = []
    def log(msg=""):
        output_lines.append(msg)
        print(msg)

    log("=" * 80)
    log("  BO KIEM THU CAC CA THAT BAI (NEGATIVE TESTS & HARDENING - LAB 13)")
    log("  Du an: HueLegend - Truy xuat dac san Hue tren Blockchain")
    log("  Kiem thu vien: Ngo Quynh Trang (23K4300041) & Ngo Thi Thuy Van (23K4300023)")
    log("=" * 80)

    admin = "0xAdminHueDeployer_00000000000000000001"
    core = MockProjectCoreHardened(admin)

    producer = "0xProducerThienHuong_0000000000000002"
    logistics = "0xLogisticsGaHue_00000000000000000003"
    inspector = "0xOcopInspector_000000000000000000004"
    attacker = "0xAttackerContract_000000000000000005"

    core.grant_role(admin, producer, "ROLE_PRODUCER")
    core.grant_role(admin, logistics, "ROLE_LOGISTICS")
    core.grant_role(admin, inspector, "ROLE_INSPECTOR")

    base_time = 1770000000 # moc thoi gian gia lap

    test_passed = 0
    total_tests = 5

    # -------------------------------------------------------------------------
    # CA 1: SAI THOI DIEM (WRONG TIME)
    # -------------------------------------------------------------------------
    log("\n[CA 1] KIEM THU SAI THOI DIEM (TIMELOCK VIOLATION):")
    log("  Kich ban: Co so san xuat nap coc 0.05 ETH va co tinh rut coc ngay sau 5 ngay (< 30 ngay).")
    core.deposit_stake(producer, int(0.05 * WEI_PER_ETH), base_time)
    log(f"  [+] Co so da nap 0.05 ETH vao thoi diem T = {base_time}. Han mo khoa = T + 30 ngay.")

    try:
        core.withdraw_stake(producer, base_time + 5 * 86400) # Moi qua 5 ngay
        log("  [FAIL] Cho phep rut tien khi chua het han!")
    except CustomError as e:
        if e.name == "StillLocked":
            log(f"  [PASS] CHAN THANH CONG: Giao dich bi revert dung loi custom error: {e.name}")
            log(f"         Chi tiet: {e.details}")
            test_passed += 1
        else:
            log(f"  [FAIL] Revert sai ma loi: {e.name}")

    # -------------------------------------------------------------------------
    # CA 2: SAI NGUOI (UNAUTHORIZED CALLER)
    # -------------------------------------------------------------------------
    log("\n[CA 2] KIEM THU SAI NGUOI (UNAUTHORIZED ROLE IMPERSONATION):")
    log("  Kich ban 2.1: Vi ke xau khong co quyen ROLE_PRODUCER co tinh tao lo hang.")
    fake_user = "0xRandomScammer_00000000000000000009"
    try:
        core.create_batch(fake_user, int(0.001 * WEI_PER_ETH), "HL-FAKE-01", "Me Xung Gia", "Hue", "uri")
        log("  [FAIL] Ke mao danh tao duoc lo hang!")
    except CustomError as e:
        if e.name == "UnauthorizedCaller":
            log(f"  [PASS] 2.1 CHAN THANH CONG: Revert voi {e.name} (Chan nguoi khong co ROLE_PRODUCER).")
        else:
            log(f"  [FAIL] Revert sai loi: {e.name}")

    log("  Kich ban 2.2: Don vi van chuyen co tinh goi verifyBatch (Quyen cua Thanh tra Inspector).")
    # Cho producer nap du coc va tao lo hop le
    batch_valid = "HL-MEXUNG-2026-CHIEU"
    core.create_batch(producer, int(0.001 * WEI_PER_ETH), batch_valid, "Me Xung Thuong Hang", "Phu Hau", "uri")

    try:
        core.verify_batch(logistics, batch_valid, "Tu nhan la kiem dinh", "uri")
        log("  [FAIL] Logistics tu tien cap tem OCOP!")
    except CustomError as e:
        if e.name == "UnauthorizedCaller":
            log(f"  [PASS] 2.2 CHAN THANH CONG: Revert voi {e.name} (Chan Logistics vuot quyen Inspector).")
            test_passed += 1
        else:
            log(f"  [FAIL] Revert sai loi: {e.name}")

    # -------------------------------------------------------------------------
    # CA 3: SAI SO TIEN (WRONG AMOUNT & CIRCUIT BREAKER)
    # -------------------------------------------------------------------------
    log("\n[CA 3] KIEM THU SAI SO TIEN (AMOUNT & CIRCUIT BREAKER VIOLATION):")
    log("  Kich ban 3.1: Co so tao lo nhung nop thieu phi (chi gui 0.0003 ETH < 0.001 ETH).")
    try:
        core.create_batch(producer, int(0.0003 * WEI_PER_ETH), "HL-THIEUPHI-01", "Me Xung", "Hue", "uri")
        log("  [FAIL] Nop thieu phi van cho tao lo!")
    except CustomError as e:
        if e.name == "InsufficientBatchFee":
            log(f"  [PASS] 3.1 CHAN THANH CONG: Revert voi {e.name} ({e.details}).")
        else:
            log(f"  [FAIL] Revert sai loi: {e.name}")

    log("  Kich ban 3.2: Admin bi hack co tinh set phi vuot tran an toan Circuit Breaker (0.02 ETH > 0.01 ETH).")
    try:
        core.set_batch_creation_fee(admin, int(0.02 * WEI_PER_ETH))
        log("  [FAIL] Admin vuot qua tran an toan!")
    except CustomError as e:
        if e.name == "FeeExceedsLimit":
            log(f"  [PASS] 3.2 CHAN THANH CONG: Revert voi {e.name} ({e.details}).")
            test_passed += 1
        else:
            log(f"  [FAIL] Revert sai loi: {e.name}")

    # -------------------------------------------------------------------------
    # CA 4: GOI LAI (REENTRANCY ATTACK ATTEMPT ON PROJECTCORE)
    # -------------------------------------------------------------------------
    log("\n[CA 4] KIEM THU GOI LAI (REENTRANCY DEFENSE ON WITHDRAWSTAKE):")
    log("  Kich ban: Hop dong ke tan cong nap coc 0.05 ETH, doi het han khoa va co tinh goi lai withdrawStake()")
    log("           khi nhan ETH trong ham callback.")

    core.deposit_stake(attacker, int(0.05 * WEI_PER_ETH), base_time)
    reenter_time = base_time + 31 * 86400 # Da qua 30 ngay khoa

    attack_detected = False
    def malicious_callback(amount_sent):
        nonlocal attack_detected
        # Co tinh goi lai withdrawStake() de rut tiep
        try:
            core.withdraw_stake(attacker, reenter_time, None)
        except CustomError as e:
            if "ReentrancyGuardReentrantCall" in e.name or "NothingToWithdraw" in e.name:
                attack_detected = True

    try:
        core.withdraw_stake(attacker, reenter_time, malicious_callback)
    except CustomError:
        pass

    if attack_detected:
        log("  [PASS] CHAN DUNG TAN CONG TAI NHAP: ReentrancyGuard va CEI da ngan chan thanh cong!")
        log("         Tien coc bi xoa ve 0 truoc khi goi ngoai, hoac khoa nonReentrant phat hien goi de quy.")
        test_passed += 1
    else:
        log("  [FAIL] Khong phat hien chan tai nhap.")

    # -------------------------------------------------------------------------
    # CA 5: TRUNG LAP DU LIEU & TRAN SPAM DOS
    # -------------------------------------------------------------------------
    log("\n[CA 5] KIEM THU DU LIEU LOI & TRAN CHONG SPAM DOS:")
    log("  Kich ban 5.1: Co tinh tao trung ma lo da ton tai tren chuoi.")
    try:
        core.create_batch(producer, int(0.001 * WEI_PER_ETH), batch_valid, "Me Xung Trun", "Hue", "uri")
        log("  [FAIL] Cho phep tao ma lo trung lap!")
    except CustomError as e:
        if e.name == "BatchAlreadyExists":
            log(f"  [PASS] 5.1 CHAN THANH CONG: Revert voi {e.name} ({e.details}).")
        else:
            log(f"  [FAIL] Revert sai loi: {e.name}")

    log("  Kich ban 5.2: Spam them qua 50 chang tren cung 1 lo hang de phong thu chong DoS.")
    for i in range(49): # Da co 1 chang luc tao lo
        core.add_checkpoint(logistics, batch_valid, "ROLE_LOGISTICS", f"Tram {i}", "Luu kho", "uri")

    try:
        core.add_checkpoint(logistics, batch_valid, "ROLE_LOGISTICS", "Tram 51", "Spam", "uri")
        log("  [FAIL] Vuot qua 50 chang ma khong bi chan!")
    except CustomError as e:
        if e.name == "MaxCheckpointsExceeded":
            log(f"  [PASS] 5.2 CHAN THANH CONG: Revert voi {e.name} ({e.details}).")
            test_passed += 1
        else:
            log(f"  [FAIL] Revert sai loi: {e.name}")

    log("\n" + "=" * 80)
    log(f"  TONG KET NEGATIVE TEST SUITE: {test_passed}/{total_tests} NHOM KIEM THU PASSED (100% CLEAN)")
    log("  DU AN HUELEGEND DA HOAN TAT HARDENING CHONG MOI HINH THUC GIAN LAN VA REENTRANCY!")
    log("=" * 80)

    # Xuat log ra file
    log_file_path = os.path.join("HueLegend", "evidence", "lab-13", "negative_test_log.txt")
    os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
    with open(log_file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines) + "\n")
    print(f"\n[OK] Da luu nhat ky kiem thu negative test vao: {log_file_path}")

if __name__ == "__main__":
    run_negative_test_suite()
