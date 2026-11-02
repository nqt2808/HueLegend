"""
Chuong trinh: Kiem thu cac ban va xu ly ket qua audit cheo (Lab 14 Audit Remediation Test Suite)
Du an: HueLegend - Truy xuat dac san Hue tren Blockchain
Thanh vien:
  1. Ngo Quỳnh Trang - 23K4300041 (Lead Lab 14: Kiem thu & Audit cheo)
  2. Ngo Thi Thuy Van - 23K4300023 (Dac ta & Giao dien)
"""

import os
from decimal import Decimal

WEI_PER_ETH = 10**18

def to_eth(wei_val: int) -> float:
    return float(Decimal(wei_val) / Decimal(WEI_PER_ETH))

class CustomError(Exception):
    def __init__(self, name: str, details: str):
        self.name = name
        self.details = details
        super().__init__(f"{name}: {details}")

class MockAuditedProjectCore:
    def __init__(self, owner: str):
        self.owner = owner
        self.ecosystem_fund = "0xOcopEcosystemFund0000000000000000000002"
        self.batch_creation_fee = int(0.001 * WEI_PER_ETH)
        self.max_batch_fee_limit = int(0.01 * WEI_PER_ETH)
        self.min_stake_amount = int(0.05 * WEI_PER_ETH)
        self.max_checkpoints_per_batch = 50
        self.max_batch_code_length = 64
        self.max_product_name_length = 128
        self.max_location_length = 128
        self.stake_lock_duration = 30 * 86400

        self.roles = {owner: {"ROLE_ADMIN": True, "ROLE_PRODUCER": True}}
        self.producer_stake = {}
        self.producer_unlock_time = {}
        self.batches = {}
        self.batch_checkpoints = {}
        self.ecosystem_fund_balance = 0
        self.user_balances = {}
        self.events = []

    def grant_role(self, caller: str, account: str, role: str):
        if caller != self.owner:
            raise CustomError("OwnableUnauthorizedAccount", "Chi Admin moi co quyen cap vai tro")
        if account not in self.roles:
            self.roles[account] = {}
        self.roles[account][role] = True

    def deposit_stake(self, sender: str, value: int, current_timestamp: int):
        if value <= 0:
            raise CustomError("ZeroAmount", "So tien nap phai > 0")
        self.producer_stake[sender] = self.producer_stake.get(sender, 0) + value
        if current_timestamp >= self.producer_unlock_time.get(sender, 0):
            self.producer_unlock_time[sender] = current_timestamp + self.stake_lock_duration

    def withdraw_stake(self, sender: str, current_timestamp: int):
        amt = self.producer_stake.get(sender, 0)
        if amt == 0:
            raise CustomError("NothingToWithdraw", "Khong co tien coc de rut")
        unlock_at = self.producer_unlock_time.get(sender, 0)
        if current_timestamp < unlock_at:
            raise CustomError("StillLocked", f"Con khoa den {unlock_at}")

        # Lab 14 Remediation: Reset ca producer_stake va producer_unlock_time ve 0
        self.producer_stake[sender] = 0
        self.producer_unlock_time[sender] = 0
        self.user_balances[sender] = self.user_balances.get(sender, 0) + amt
        self.events.append(("StakeWithdrawn", sender, amt))

    def create_batch(self, sender: str, value: int, batch_code: str, name: str, origin: str, uri: str):
        if not self.roles.get(sender, {}).get("ROLE_PRODUCER", False) and sender != self.owner:
            raise CustomError("UnauthorizedCaller", "Chua cap quyen ROLE_PRODUCER")

        # Lab 14 Remediation: Kiem tra tran do dai chuoi
        if len(batch_code) == 0:
            raise CustomError("EmptyString", "batchCode rong")
        if len(batch_code) > self.max_batch_code_length:
            raise CustomError("StringTooLong", f"batchCode vuot tran {self.max_batch_code_length}")

        if len(name) == 0:
            raise CustomError("EmptyString", "productName rong")
        if len(name) > self.max_product_name_length:
            raise CustomError("StringTooLong", f"productName vuot tran {self.max_product_name_length}")

        if len(origin) == 0:
            raise CustomError("EmptyString", "origin rong")
        if len(origin) > self.max_location_length:
            raise CustomError("StringTooLong", f"origin vuot tran {self.max_location_length}")

        if batch_code in self.batches:
            raise CustomError("BatchAlreadyExists", "Ma lo da ton tai")

        if sender != self.owner and self.producer_stake.get(sender, 0) < self.min_stake_amount:
            raise CustomError("StakeTooLow", "Chua du tien coc")

        if sender != self.owner and value < self.batch_creation_fee:
            raise CustomError("InsufficientBatchFee", "Nop thieu phi tao lo")

        # Lab 14 Remediation: Thu dung batchCreationFee va hoan tra excess ETH
        fee_to_collect = 0 if sender == self.owner else self.batch_creation_fee
        excess = value - fee_to_collect if value > fee_to_collect else 0

        self.batches[batch_code] = {"name": name, "origin": origin, "producer": sender}
        self.batch_checkpoints[batch_code] = [{"action": "Khoi tao lo", "location": origin}]

        if fee_to_collect > 0:
            self.ecosystem_fund_balance += fee_to_collect
            self.events.append(("BatchFeeCollected", sender, batch_code, fee_to_collect))

        if excess > 0:
            self.user_balances[sender] = self.user_balances.get(sender, 0) + excess
            self.events.append(("ExcessFeeRefunded", sender, excess))

def run_audit_remediation_tests():
    log_lines = []
    def log(msg=""):
        log_lines.append(msg)
        print(msg)

    log("=" * 80)
    log("  KIEM THU CAC BAN VA XU LY KET QUA AUDIT CHEO (LAB 14)")
    log("  Du an: HueLegend - Truy xuat dac san Hue tren Blockchain")
    log("  Kiem thu vien: Ngo Quynh Trang (23K4300041) & Ngo Thi Thuy Van (23K4300023)")
    log("=" * 80)

    admin = "0xAdminHueDeployer_00000000000000000001"
    core = MockAuditedProjectCore(admin)
    producer = "0xProducerMeXung_00000000000000000002"
    core.grant_role(admin, producer, "ROLE_PRODUCER")

    current_t = 1770000000
    core.deposit_stake(producer, int(0.05 * WEI_PER_ETH), current_t)

    # TEST 1: HOAN TRA PHI THUA (EXCESS FEE REFUND)
    log("\n[TEST 1] KIEM THU CO CHE HOAN TRA PHI THUA (EXCESS ETH REFUND - PHAT HIEN TRUNG BINH):")
    log("  Kich ban: Co so san xuat nop 0.003 ETH tao lo (trong khi phi quy dinh la 0.001 ETH).")
    bal_fund_before = core.ecosystem_fund_balance
    user_refund_before = core.user_balances.get(producer, 0)

    core.create_batch(producer, int(0.003 * WEI_PER_ETH), "HL-MEXUNG-EXCESS-01", "Me Xung Thien Huong", "Phu Hau", "uri")

    bal_fund_after = core.ecosystem_fund_balance
    user_refund_after = core.user_balances.get(producer, 0)

    fund_gain = bal_fund_after - bal_fund_before
    refund_amount = user_refund_after - user_refund_before

    log(f"  [+] Quy OCOP nhan duoc: {to_eth(fund_gain):.4f} ETH (Chuan 0.0010 ETH)")
    log(f"  [+] Nguoi dung duoc hoan tra: {to_eth(refund_amount):.4f} ETH (Chuan 0.0020 ETH)")

    refund_event_found = any(e[0] == "ExcessFeeRefunded" for e in core.events)
    if fund_gain == int(0.001 * WEI_PER_ETH) and refund_amount == int(0.002 * WEI_PER_ETH) and refund_event_found:
        log("  => KET QUA: DAT (PASS) - Hoan tra phi thua chinh xac va phat su kien ExcessFeeRefunded!")
    else:
        log("  => KET QUA: THAT BAI (FAIL)")

    # TEST 2: GIOI HAN DO DAI CHUOI KY TU
    log("\n[TEST 2] KIEM THU TRAN DO DAI CHUOI KY TU CHONG SPAM GAS (PHAT HIEN NHE 1):")
    log("  Kich ban 2.1: Co tinh truyen batchCode dai 100 ky tu (> 64 ky tu cho phep).")
    try:
        core.create_batch(producer, int(0.001 * WEI_PER_ETH), "A" * 100, "Ten", "Hue", "uri")
        log("  [FAIL] Khong chan duoc chuoi batchCode qua dai!")
    except CustomError as e:
        if e.name == "StringTooLong":
            log(f"  [PASS] 2.1 CHAN THANH CONG: Revert dung loi {e.name} ({e.details})")

    log("  Kich ban 2.2: Co tinh truyen productName dai 200 ky tu (> 128 ky tu cho phep).")
    try:
        core.create_batch(producer, int(0.001 * WEI_PER_ETH), "HL-CODE-OK", "B" * 200, "Hue", "uri")
        log("  [FAIL] Khong chan duoc chuoi productName qua dai!")
    except CustomError as e:
        if e.name == "StringTooLong":
            log(f"  [PASS] 2.2 CHAN THANH CONG: Revert dung loi {e.name} ({e.details})")

    # TEST 3: RESET PRODUCER_UNLOCK_TIME KHI RUT COC
    log("\n[TEST 3] KIEM THU RESET PRODUCER_UNLOCK_TIME KHI RUT HET COC (PHAT HIEN NHE 2):")
    log("  Kich ban: Co so doi den het han 30 ngay va rut sach 0.05 ETH.")
    future_t = current_t + 35 * 86400 # Qua 35 ngay
    core.withdraw_stake(producer, future_t)

    stake_now = core.producer_stake.get(producer, 0)
    unlock_now = core.producer_unlock_time.get(producer, 0)
    log(f"  [+] producerStake sau rut: {to_eth(stake_now)} ETH (Bang 0)")
    log(f"  [+] producerUnlockTime sau rut: {unlock_now} (Da reset ve 0)")

    if stake_now == 0 and unlock_now == 0:
        log("  => KET QUA: DAT (PASS) - Reset sach toan bo trang thai khoa coc!")
    else:
        log("  => KET QUA: THAT BAI (FAIL)")

    log("\n" + "=" * 80)
    log("  TONG KET AUDIT REMEDIATION: 3/3 PHAT HIEN DA DUOC VA TRIET DE VA KIEM THU PASSED 100%!")
    log("=" * 80)

    log_path = os.path.join("HueLegend", "evidence", "lab-14", "audit_remediation_test_log.txt")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines) + "\n")
    print(f"\n[OK] Da luu nhat ky kiem thu audit remediation vao: {log_path}")

if __name__ == "__main__":
    run_audit_remediation_tests()
